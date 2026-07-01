// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { calculatePoints, calculateScorerBonusMulti } from "@/lib/points";
import { checkAndAwardBadges } from "@/lib/badges";

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
    .select("id, home_team, away_team, kickoff_at, stage")
    .neq("status", "finished")
    .lt("kickoff_at", cutoff)
    .gt("kickoff_at", windowStart)
    .order("kickoff_at");

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

  for (const m of pending) {
    // Chercher dans les matchs terminés
    const fix = done.find((f: any) =>
      teamsMatch(m.home_team, f.homeTeam?.name ?? "") &&
      teamsMatch(m.away_team, f.awayTeam?.name ?? "")
    );

    if (fix) {
      const hs = fix.score?.fullTime?.home ?? 0;
      const as_ = fix.score?.fullTime?.away ?? 0;

      await supabase.from("matches")
        .update({ home_score: hs, away_score: as_, status: "finished" })
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

        await Promise.all((predsFull ?? preds).map(async (p: any) => {
          const pts = calculatePoints(p.home_score_pred, p.away_score_pred, hs, as_);
          const predictedIds = byPred[p.id] ?? [];
          const bonus = realScorerDbIds.length > 0
            ? calculateScorerBonusMulti(predictedIds, realScorerDbIds)
            : 0;
          await supabase.from("predictions")
            .update({ points_earned: pts + bonus, is_locked: true })
            .eq("id", p.id);
          if (p.user_id && p.league_id) {
            await checkAndAwardBadges(p.user_id, p.league_id);
          }
        }));

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
        "Huitièmes de finale": "HF",
        "Quarts de finale": "QF",
        "Demi-finales": "DF",
      };
      if (m.stage && NEXT_STAGE[m.stage]) {
        const nextStage = NEXT_STAGE[m.stage];
        const prefix = PLACEHOLDER_PREFIX[m.stage];
        const { data: stageMatches } = await supabase
          .from("matches").select("id, kickoff_at")
          .eq("stage", m.stage).order("kickoff_at", { ascending: true });
        const slot = (stageMatches ?? []).findIndex((sm: any) => sm.id === m.id) + 1;
        if (slot > 0) {
          // score.winner = "HOME_TEAM" | "AWAY_TEAM" (gère les tirs au but automatiquement)
          const apiWinner = fix.score?.winner;
          const winner = apiWinner === "HOME_TEAM"
            ? m.home_team
            : apiWinner === "AWAY_TEAM"
              ? m.away_team
              : hs > as_ ? m.home_team : m.away_team; // fallback si winner absent
          const placeholder = `Vainqueur ${prefix}${slot}`;
          await supabase.from("matches").update({ home_team: winner })
            .eq("stage", nextStage).eq("home_team", placeholder);
          await supabase.from("matches").update({ away_team: winner })
            .eq("stage", nextStage).eq("away_team", placeholder);
        }
      }

      updated++;
      continue;
    }

    // Chercher dans les matchs en cours
    const liveFix = inProgress.find((f: any) =>
      teamsMatch(m.home_team, f.homeTeam?.name ?? "") &&
      teamsMatch(m.away_team, f.awayTeam?.name ?? "")
    );

    if (liveFix) {
      const hs = liveFix.score?.fullTime?.home ?? 0;
      const as_ = liveFix.score?.fullTime?.away ?? 0;
      await supabase.from("matches")
        .update({ home_score: hs, away_score: as_, status: "live" })
        .eq("id", m.id);
      updated++;
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    debug: {
      pending_count: pending.length,
      fixtures_total: allFixtures.length,
      finished_count: done.length,
      live_count: inProgress.length,
      fixtures_sample: allFixtures.slice(0, 3).map((f: any) =>
        `${f.homeTeam?.name} vs ${f.awayTeam?.name} [${f.status}]`
      ),
    },
  });
}
