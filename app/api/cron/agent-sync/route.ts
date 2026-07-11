// @ts-nocheck
export const dynamic = "force-dynamic";
// Endpoint appelé par l'agent Claude pour pousser résultats + buteurs vérifiés
// L'agent a croisé 3 sources officielles avant d'appeler ce endpoint
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { calculatePoints, calculateScorerBonusMulti } from "@/lib/points";
import { checkAndAwardBadges } from "@/lib/badges";
import { isKnockoutBonus, getMultiplier, getRankSnapshot, applyCourageuxBonus, scoreTournamentPredictions } from "@/lib/phase-finale";
import { scoreAiPredictions } from "@/lib/ai-predictor";

// ─── Normalisation des noms ────────────────────────────────────────────────
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-'.`,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Matching équipe (DB français ↔ nom envoyé par l'agent) ───────────────
function teamsMatch(dbName: string, agentName: string): boolean {
  const a = norm(dbName);
  const b = norm(agentName);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // mot commun d'au moins 4 lettres
  const wa = a.split(" ").filter((w) => w.length >= 4);
  const wb = b.split(" ").filter((w) => w.length >= 4);
  return wa.some((w) => wb.includes(w));
}

// ─── Trouver match en DB par noms d'équipes ───────────────────────────────
async function findMatch(supabase: any, homeTeam: string, awayTeam: string) {
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, status, stage, kickoff_at, home_flag, away_flag, penalty_winner");
  return (matches ?? []).find(
    (m: any) => teamsMatch(m.home_team, homeTeam) && teamsMatch(m.away_team, awayTeam)
  ) ?? null;
}

// ─── Trouver joueur en DB par nom (fuzzy multi-niveaux) ───────────────────
async function findPlayer(supabase: any, name: string, allPlayers: any[]): Promise<{ id: string; name: string } | null> {
  const normInput = norm(name);
  const parts = normInput.split(" ").filter((p) => p.length >= 3);

  // Niveau 1 : correspondance exacte normalisée
  let p = allPlayers.find((pl) => norm(pl.name) === normInput);
  if (p) return p;

  // Niveau 2 : tous les mots du nom saisi sont dans le nom DB
  p = allPlayers.find((pl) => {
    const dbNorm = norm(pl.name);
    return parts.every((part) => dbNorm.includes(part));
  });
  if (p) return p;

  // Niveau 3 : nom de famille seul (si ≥ 4 lettres)
  if (parts.length > 1) {
    const lastName = parts[parts.length - 1];
    if (lastName.length >= 4) {
      p = allPlayers.find((pl) => norm(pl.name).includes(lastName));
      if (p) return p;
    }
  }

  // Niveau 4 : prénom seul (si ≥ 5 lettres, rare mais utile pour Neymar, Vinicius…)
  if (parts.length >= 1 && parts[0].length >= 5) {
    p = allPlayers.find((pl) => norm(pl.name).startsWith(parts[0]));
    if (p) return p;
  }

  return null;
}

// ─── Handler principal ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { results = [], alerts = [] } = body;

  if (!results.length && !alerts.length) {
    return NextResponse.json({ success: true, message: "Rien à traiter" });
  }

  const supabase = createAdminClient();

  // Charger tous les joueurs en une fois
  const { data: allPlayers } = await supabase.from("players").select("id, name, team_name");
  const players = allPlayers ?? [];

  const report: any[] = [];
  const unmappedScorers: string[] = [];
  let totalBonuses = 0;

  for (const result of results) {
    const {
      home_team,
      away_team,
      home_score,
      away_score,
      scorers = [],
      confidence,
      sources = [],
    } = result;

    // ── Trouver le match ──────────────────────────────────────────────────
    const match = await findMatch(supabase, home_team, away_team);
    if (!match) {
      report.push({ status: "skipped", reason: "match_non_trouve", home_team, away_team });
      continue;
    }

    // ── Mettre à jour le score si pas encore terminé ─────────────────────
    if (match.status !== "finished") {
      await supabase
        .from("matches")
        .update({ home_score, away_score, status: "finished" })
        .eq("id", match.id);
    } else if (match.home_score !== home_score || match.away_score !== away_score) {
      // Score divergent : sauvegarder quand même (l'agent a vérifié 3 sources)
      await supabase
        .from("matches")
        .update({ home_score, away_score })
        .eq("id", match.id);
    }

    // ── Mapper les noms de buteurs → player_ids ───────────────────────────
    const scorerIds: string[] = [];
    const notFound: string[] = [];

    for (const name of scorers) {
      const found = await findPlayer(supabase, name, players);
      if (found) {
        scorerIds.push(found.id);
      } else {
        notFound.push(`${name} (${match.home_team} vs ${match.away_team})`);
        unmappedScorers.push(`${name} (${match.home_team} vs ${match.away_team})`);
      }
    }

    // ── Insérer dans match_scorers ────────────────────────────────────────
    if (scorerIds.length > 0) {
      await supabase.from("match_scorers").delete().eq("match_id", match.id);
      for (const playerId of scorerIds) {
        await supabase.from("match_scorers").insert({ match_id: match.id, player_id: playerId });
      }
    }

    // ── Recalculer points + bonus pour toutes les prédictions du match ────
    const knockoutBonus = isKnockoutBonus(match.stage ?? "");

    const { data: preds } = await supabase
      .from("predictions")
      .select("id, home_score_pred, away_score_pred, user_id, league_id")
      .eq("match_id", match.id);

    if (preds?.length) {
      const predIds = preds.map((p: any) => p.id);

      const { data: scorerPreds } = await supabase
        .from("scorer_predictions")
        .select("prediction_id, player_id")
        .in("prediction_id", predIds);

      const byPred: Record<string, string[]> = {};
      for (const sp of scorerPreds ?? []) {
        if (!byPred[sp.prediction_id]) byPred[sp.prediction_id] = [];
        if (sp.player_id) byPred[sp.prediction_id].push(sp.player_id);
      }

      // Snapshot des rangs avant scoring (pour multiplicateur phase finale)
      const leagueIds = [...new Set(preds.map((p: any) => p.league_id).filter(Boolean))];
      const rankSnapshot = knockoutBonus
        ? await getRankSnapshot(leagueIds, supabase)
        : new Map<string, number>();

      for (const p of preds) {
        const pts = calculatePoints(p.home_score_pred, p.away_score_pred, home_score, away_score);
        const predictedIds = byPred[p.id] ?? [];
        const scorerBonus = scorerIds.length > 0
          ? calculateScorerBonusMulti(predictedIds, scorerIds)
          : 0;

        let total = pts + scorerBonus;

        // Multiplicateur rang (phase éliminatoire uniquement)
        if (knockoutBonus && p.user_id && p.league_id) {
          const rank = rankSnapshot.get(`${p.league_id}:${p.user_id}`) ?? 1;
          const mult = getMultiplier(rank);
          total = Math.round(total * mult * 10) / 10;
        }

        await supabase
          .from("predictions")
          .update({ points_earned: total, is_locked: true })
          .eq("id", p.id);

        if (p.user_id && p.league_id) {
          checkAndAwardBadges(p.user_id, p.league_id).catch(() => {});
        }
      }

      // Mettre à jour bonus_earned sur scorer_predictions
      for (const predId of Object.keys(byPred)) {
        const bonus = scorerIds.length > 0
          ? calculateScorerBonusMulti(byPred[predId], scorerIds)
          : 0;
        await supabase
          .from("scorer_predictions")
          .update({ bonus_earned: bonus })
          .eq("prediction_id", predId);
        totalBonuses++;
      }

      // Bonus courageux (phase éliminatoire uniquement)
      if (knockoutBonus) {
        applyCourageuxBonus(match.id, home_score, away_score, supabase).catch(() => {});
      }

      // Pronostics tournoi (demi-finalistes / vainqueur)
      if (knockoutBonus) {
        const isHomeWin = home_score > away_score;
        const hasPenalties = match.penalty_winner != null;
        const advancingTeam = hasPenalties
          ? (match.penalty_winner === "home" ? match.home_team : match.away_team)
          : (isHomeWin ? match.home_team : match.away_team);
        scoreTournamentPredictions(match.stage, advancingTeam, supabase).catch(() => {});
      }
    }

    // ── Scorer la prédiction IA (GOAT IA) ────────────────────────────────
    scoreAiPredictions(match.id, home_score, away_score, scorerIds).catch(() => {});

    report.push({
      status: "success",
      match: `${match.home_team} ${home_score}-${away_score} ${match.away_team}`,
      scorers_mapped: scorerIds.length,
      scorers_not_found: notFound,
      confidence,
      sources,
      predictions_updated: preds?.length ?? 0,
    });
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    bonuses_recalculated: totalBonuses,
    report,
    unmapped_scorers: unmappedScorers,
    alerts_received: alerts,
    timestamp: new Date().toISOString(),
  });
}
