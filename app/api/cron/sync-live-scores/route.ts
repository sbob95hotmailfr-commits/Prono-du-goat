// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { calculatePoints, calculateScorerBonusMulti } from "@/lib/points";
import { checkAndAwardBadges } from "@/lib/badges";
import { syncPlayerStats } from "@/lib/sync-player-stats";
import { generateAiPrediction, scoreAiPredictions } from "@/lib/ai-predictor";
import { sendEmbed, buildResultEmbed, buildReminderEmbed, GUILD_ID } from "@/lib/discord";
import { createAdminClient as adminClient } from "@/lib/supabase/server";
import { isKnockoutBonus, getMultiplier, getRankSnapshot, applyCourageuxBonus, scoreTournamentPredictions } from "@/lib/phase-finale";

// Traduction noms FR → anglais (football-data.org utilise des noms anglais)
const FR_TO_EN: Record<string, string> = {
  "etats unis": "united states",
  "mexique": "mexico",
  "afrique du sud": "south africa",
  "coree du sud": "south korea",
  "bosnie herzegovine": "bosnia-herzegovina",
  "bosnie et herzegovine": "bosnia-herzegovina",
  "colombie": "colombia",
  "suisse": "switzerland",
  "angleterre": "england",
  "croatie": "croatia",
  "nouvelle zelande": "new zealand",
  "equateur": "ecuador",
  "perou": "peru",
  "chili": "chile",
  "argentine": "argentina",
  "bresil": "brazil",
  "algerie": "algeria",
  "senegal": "senegal",
  "allemagne": "germany",
  "arabie saoudite": "saudi arabia",
  "japon": "japan",
  "australie": "australia",
  "espagne": "spain",
  "maroc": "morocco",
  "tunisie": "tunisia",
  "egypte": "egypt",
  "serbie": "serbia",
  "georgie": "georgia",
  "suede": "sweden",
  "norvege": "norway",
  "cameroun": "cameroon",
  "ecosse": "scotland",
  "italie": "italy",
  "slovaquie": "slovakia",
  "pays bas": "netherlands",
  "pologne": "poland",
  "autriche": "austria",
  "belgique": "belgium",
  "danemark": "denmark",
  "rd congo": "dr congo",
  "republique democratique du congo": "dr congo",
  "cote d ivoire": "ivory coast",
  "cote divoire": "ivory coast",
  "cap vert": "cape verde",
  "paraguai": "paraguay",
  "indonesie": "indonesia",
  "ouzbekistan": "uzbekistan",
  "portugal": "portugal",
  "uruguay": "uruguay",
  "canada": "canada",
};

// Aliases spécifiques football-data.org
const API_ALIASES: Record<string, string> = {
  "usa": "united states",
  "korea republic": "south korea",
  "republic of korea": "south korea",
  "ivory coast": "ivory coast",
  "côte d'ivoire": "ivory coast",
  "dr congo": "dr congo",
  "congo dr": "dr congo",
  "bosnia and herzegovina": "bosnia-herzegovina",
};

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/&/g, "and")
    .replace(/-/g, " ").replace(/['''`]/g, "")
    .replace(/\s+/g, " ").trim();
}
function toEn(fr: string): string { const n = norm(fr); return FR_TO_EN[n] ?? n; }
function normApi(api: string): string { const n = norm(api); return API_ALIASES[n] ?? n; }
function teamsMatch(db: string, api: string): boolean {
  const dbEn = norm(toEn(db));
  const apiEn = normApi(norm(api));
  if (dbEn === apiEn) return true;
  if (norm(db) === apiEn) return true;
  if (dbEn.includes(apiEn) || apiEn.includes(dbEn)) return true;
  const dbWords = dbEn.split(" ").filter(w => w.length >= 4);
  const apiWords = apiEn.split(" ").filter(w => w.length >= 4);
  return dbWords.some(w => apiWords.includes(w));
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const API_KEY = process.env.API_FOOTBALL_KEY;
  if (!API_KEY) return NextResponse.json({ error: "API_FOOTBALL_KEY manquant" }, { status: 500 });

  const supabase = createAdminClient();

  // Force les matchs "live" depuis plus de 3h à "finished"
  await supabase.from("matches")
    .update({ status: "finished" })
    .eq("status", "live")
    .lt("kickoff_at", new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString());

  // Matchs non terminés dans une fenêtre de 7 jours
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: pending } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_flag, away_flag, kickoff_at, stage, api_match_id")
    .neq("status", "finished")
    .lt("kickoff_at", cutoff)
    .gt("kickoff_at", windowStart)
    .order("kickoff_at");

  // Générer les pronostics IA pour les matchs à venir dans les 24h (non bloquant)
  const upcoming24h = await supabase
    .from("matches")
    .select("id")
    .eq("status", "upcoming")
    .gt("kickoff_at", new Date().toISOString())
    .lt("kickoff_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  for (const m of upcoming24h.data ?? []) {
    generateAiPrediction(m.id).catch(() => {});
  }

  if (!pending?.length) return NextResponse.json({ success: true, updated: 0, debug: "no_pending_matches" });

  // Récupérer TOUS les matchs WC 2026 depuis football-data.org (1 seul appel API)
  let allFixtures: any[] = [];
  let apiError: any = null;

  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches",
      {
        headers: { "X-Auth-Token": API_KEY },
        cache: "no-store",
      }
    );
    const data = await res.json();
    if (!res.ok) {
      apiError = data;
    } else {
      allFixtures = data.matches ?? [];
    }
  } catch (e: any) {
    apiError = { message: e?.message ?? "fetch_failed" };
  }

  if (apiError) {
    return NextResponse.json({ success: false, updated: 0, debug: { api_error: apiError } });
  }

  // Statuts football-data.org
  const FINISHED_STATUSES = ["FINISHED"];
  const LIVE_STATUSES = ["IN_PLAY", "PAUSED", "HALFTIME"];

  const done = allFixtures.filter((f: any) => FINISHED_STATUSES.includes(f.status));
  const inProgress = allFixtures.filter((f: any) => LIVE_STATUSES.includes(f.status));

  let updated = 0;

  // Indexer les fixtures API par ID pour lookup O(1)
  const fixtureById = new Map<number, any>(allFixtures.map((f: any) => [f.id, f]));

  for (const m of pending) {
    // Chercher dans les matchs terminés — ID exact en priorité, fuzzy en fallback
    const fix = (() => {
      if ((m as any).api_match_id) {
        const byId = fixtureById.get(Number((m as any).api_match_id));
        return byId && byId.status === "FINISHED" ? byId : undefined;
      }
      // Fallback fuzzy : filtrer d'abord par fenêtre de ±36h puis par noms
      const kickoff = new Date(m.kickoff_at).getTime();
      return done.find((f: any) => {
        const diffH = Math.abs(new Date(f.utcDate).getTime() - kickoff) / 3600000;
        return diffH < 36 &&
          teamsMatch(m.home_team, f.homeTeam?.name ?? "") &&
          teamsMatch(m.away_team, f.awayTeam?.name ?? "");
      });
    })();

    if (fix) {
      // Score 90 min uniquement (jamais ET ni penalties)
      const hs = fix.score?.fullTime?.home ?? 0;
      const as_ = fix.score?.fullTime?.away ?? 0;

      // Sauvegarder l'api_match_id pour les prochains appels (matching parfait)
      const updatePayload: any = { home_score: hs, away_score: as_, status: "finished" };
      if (!(m as any).api_match_id && fix.id) updatePayload.api_match_id = fix.id;
      // Stocker le vainqueur TAB si le match s'est joué aux tirs au but
      if (fix.score?.penalties) {
        updatePayload.penalty_winner = fix.score.winner === "HOME_TEAM" ? "home" : "away";
      }

      await supabase.from("matches")
        .update(updatePayload)
        .eq("id", m.id);

      const { data: preds } = await supabase.from("predictions")
        .select("id, home_score_pred, away_score_pred")
        .eq("match_id", m.id);

      // Extraire les buteurs réels depuis fix.goals (football-data.org fournit scorer.id)
      const goals = fix.goals ?? [];
      const scorerApiIds: number[] = goals
        .filter((g: any) => g.scorer?.id)
        .map((g: any) => Number(g.scorer.id));

      let realScorerDbIds: string[] = [];

      if (scorerApiIds.length > 0) {
        const { data: matchingPlayers } = await supabase
          .from("players")
          .select("id, api_football_id")
          .in("api_football_id", scorerApiIds);

        const apiToDb = new Map(
          (matchingPlayers ?? []).map((p: any) => [Number(p.api_football_id), p.id as string])
        );

        // Conserver les doublons (hat-trick = même joueur 3x)
        realScorerDbIds = scorerApiIds
          .map((id) => apiToDb.get(id))
          .filter((id): id is string => Boolean(id));

        if (realScorerDbIds.length > 0) {
          await supabase.from("match_scorers").delete().eq("match_id", m.id);
          for (const playerId of realScorerDbIds) {
            await supabase.from("match_scorers").insert({ match_id: m.id, player_id: playerId });
          }
        }
      }

      if (preds?.length) {
        const predIds = preds.map((p: any) => p.id);

        // Récupérer tous les pronostics buteur pour ce match
        const { data: scorerPreds } = await supabase
          .from("scorer_predictions")
          .select("prediction_id, player_id")
          .in("prediction_id", predIds);

        const byPred: Record<string, string[]> = {};
        for (const sp of scorerPreds ?? []) {
          if (!byPred[sp.prediction_id]) byPred[sp.prediction_id] = [];
          if (sp.player_id) byPred[sp.prediction_id].push(sp.player_id);
        }

        // Mettre à jour points = score + bonus buteur
        const { data: predsFull } = await supabase
          .from("predictions")
          .select("id, home_score_pred, away_score_pred, user_id, league_id")
          .in("id", predIds);

        // Phase finale : snapshot des rangs avant scoring (pour multiplicateur)
        const knockoutBonus = isKnockoutBonus(m.stage ?? "");
        const leagueIds = [...new Set((predsFull ?? []).map((p: any) => p.league_id).filter(Boolean))];
        const rankSnapshot = knockoutBonus
          ? await getRankSnapshot(leagueIds, supabase)
          : new Map<string, number>();

        await Promise.all((predsFull ?? preds).map(async (p: any) => {
          const pts = calculatePoints(p.home_score_pred, p.away_score_pred, hs, as_);
          const predictedIds = byPred[p.id] ?? [];
          const bonus = realScorerDbIds.length > 0
            ? calculateScorerBonusMulti(predictedIds, realScorerDbIds)
            : 0;

          let total = pts + bonus;

          // Appliquer le multiplicateur selon la position dans la ligue
          if (knockoutBonus && p.user_id && p.league_id) {
            const rank = rankSnapshot.get(`${p.league_id}:${p.user_id}`) ?? 1;
            const mult = getMultiplier(rank);
            total = Math.round(total * mult * 10) / 10;
          }

          await supabase.from("predictions")
            .update({ points_earned: total, is_locked: true })
            .eq("id", p.id);
          if (p.user_id && p.league_id) {
            await checkAndAwardBadges(p.user_id, p.league_id);
          }
        }));

        // Bonus courageux (après scoring normal)
        if (knockoutBonus) {
          applyCourageuxBonus(m.id, hs, as_, supabase).catch(() => {});
        }

        // Sauvegarder bonus_earned sur scorer_predictions si on a les buteurs réels
        if (realScorerDbIds.length > 0) {
          for (const predId of Object.keys(byPred)) {
            const bonus = calculateScorerBonusMulti(byPred[predId], realScorerDbIds);
            await supabase.from("scorer_predictions")
              .update({ bonus_earned: bonus })
              .eq("prediction_id", predId);
          }
        }
      }

      // Propagation bracket si match knockout
      const NEXT_STAGE: Record<string, string> = {
        "Seizièmes de finale": "Huitièmes de finale",
        "Huitièmes de finale": "Quarts de finale",
        "Quarts de finale": "Demi-finales",
        "Demi-finales": "Finale",
      };
      const PLACEHOLDER_PREFIX: Record<string, string> = {
        "Seizièmes de finale": "HF",
        "Huitièmes de finale": "QF",
        "Quarts de finale": "DF",
        "Demi-finales": "F",
      };
      if (m.stage && NEXT_STAGE[m.stage]) {
        const nextStage = NEXT_STAGE[m.stage];
        const prefix = PLACEHOLDER_PREFIX[m.stage];
        const { data: stageMatches } = await supabase
          .from("matches").select("id, kickoff_at")
          .eq("stage", m.stage).order("kickoff_at", { ascending: true });
        const slot = (stageMatches ?? []).findIndex((sm: any) => sm.id === m.id) + 1;
        if (slot > 0) {
          // score.winner gère les tirs au but automatiquement
          const apiWinner = fix.score?.winner;
          const isHomeWin = apiWinner === "HOME_TEAM" || (!apiWinner && hs > as_);
          const winner = isHomeWin ? m.home_team : m.away_team;
          const winnerFlag = isHomeWin ? (m as any).home_flag : (m as any).away_flag;
          const placeholder = `Vainqueur ${prefix}${slot}`;
          await supabase.from("matches")
            .update({ home_team: winner, home_flag: winnerFlag ?? "🏳️" })
            .eq("stage", nextStage).eq("home_team", placeholder);
          await supabase.from("matches")
            .update({ away_team: winner, away_flag: winnerFlag ?? "🏳️" })
            .eq("stage", nextStage).eq("away_team", placeholder);
        }
      }

      // Scorer les pronostics IA pour ce match
      scoreAiPredictions(m.id, hs, as_, realScorerDbIds).catch(() => {});

      // Scorer le pronostic spécial (Bonus 4)
      if (isKnockoutBonus(m.stage ?? "")) {
        const apiWinner = fix.score?.winner;
        const isHomeWin = apiWinner === "HOME_TEAM" || (!apiWinner && hs > as_);
        const advancingTeam = isHomeWin ? m.home_team : m.away_team;
        scoreTournamentPredictions(m.stage, advancingTeam, supabase).catch(() => {});
      }

      // Notifier Discord (non bloquant)
      if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_RESULTS_CHANNEL_ID) {
        (async () => {
          try {
            // Top pronostics pour l'embed
            const { data: topPreds } = await supabase
              .from("predictions")
              .select("home_score_pred, away_score_pred, points_earned, user_id")
              .eq("match_id", m.id)
              .order("points_earned", { ascending: false })
              .limit(5);
            const userIds = (topPreds ?? []).map((p: any) => p.user_id);
            let withNames: any[] = topPreds ?? [];
            if (userIds.length) {
              const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
              const pm = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.username]));
              withNames = (topPreds ?? []).map((p: any) => ({ ...p, username: pm[p.user_id] ?? "?" }));
            }
            await sendEmbed(
              process.env.DISCORD_RESULTS_CHANNEL_ID!,
              buildResultEmbed({ ...m, home_score: hs, away_score: as_ }, withNames)
            );
          } catch {}
        })();
      }

      updated++;
      continue;
    }

    // Chercher dans les matchs en cours — ID exact en priorité, fuzzy en fallback
    const liveFix = (() => {
      if ((m as any).api_match_id) {
        const byId = fixtureById.get(Number((m as any).api_match_id));
        return byId && ["IN_PLAY","PAUSED","HALFTIME"].includes(byId.status) ? byId : undefined;
      }
      const kickoff = new Date(m.kickoff_at).getTime();
      return inProgress.find((f: any) => {
        const diffH = Math.abs(new Date(f.utcDate).getTime() - kickoff) / 3600000;
        return diffH < 36 &&
          teamsMatch(m.home_team, f.homeTeam?.name ?? "") &&
          teamsMatch(m.away_team, f.awayTeam?.name ?? "");
      });
    })();

    if (liveFix) {
      const hs = liveFix.score?.fullTime?.home ?? 0;
      const as_ = liveFix.score?.fullTime?.away ?? 0;
      const livePayload: any = { home_score: hs, away_score: as_, status: "live" };
      if (!(m as any).api_match_id && liveFix.id) livePayload.api_match_id = liveFix.id;
      await supabase.from("matches")
        .update(livePayload)
        .eq("id", m.id);
      updated++;
    }
  }

  // Sync stats joueurs (buteurs / passes D) — non bloquant
  let statsResult: any = {};
  try {
    statsResult = await syncPlayerStats(API_KEY);
  } catch (e: any) {
    statsResult = { error: e?.message };
  }

  return NextResponse.json({
    success: true,
    updated,
    stats_updated: statsResult.updated ?? 0,
    debug: {
      pending_count: pending.length,
      fixtures_total: allFixtures.length,
      finished_count: done.length,
      live_count: inProgress.length,
      stats: statsResult,
    },
  });
}
