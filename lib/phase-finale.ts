// @ts-nocheck

// Stages éligibles au multiplicateur (QF, SF, Finale)
export function isKnockoutBonus(stage: string): boolean {
  return /quart|demi|finale/i.test(stage);
}

// Multiplicateur selon la position dans la ligue
export function getMultiplier(rank: number): number {
  if (rank <= 3) return 1;
  if (rank <= 6) return 1.5;
  return 2;
}

// Snapshot des rangs par ligue (avant de scorer pour éviter les effets de bord)
export async function getRankSnapshot(
  leagueIds: string[],
  supabase: any
): Promise<Map<string, number>> {
  const rankMap = new Map<string, number>();
  for (const leagueId of leagueIds) {
    const { data: standings } = await supabase
      .from("league_standings")
      .select("user_id, total_points")
      .eq("league_id", leagueId)
      .order("total_points", { ascending: false });
    (standings ?? []).forEach((s: any, i: number) => {
      rankMap.set(`${leagueId}:${s.user_id}`, i + 1);
    });
  }
  return rankMap;
}

// Bonus pronostic courageux : seul contre tous avec le bon résultat
export async function applyCourageuxBonus(
  matchId: string,
  homeScore: number,
  awayScore: number,
  supabase: any
): Promise<void> {
  const { data: allPreds } = await supabase
    .from("predictions")
    .select("id, home_score_pred, away_score_pred, points_earned, league_id")
    .eq("match_id", matchId);

  if (!allPreds?.length) return;

  // Regrouper par ligue (le bonus est "seul dans SA ligue")
  const byLeague: Record<string, any[]> = {};
  for (const p of allPreds) {
    if (!byLeague[p.league_id]) byLeague[p.league_id] = [];
    byLeague[p.league_id].push(p);
  }

  const realWinner =
    homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw";

  for (const preds of Object.values(byLeague)) {
    if (preds.length <= 1) continue; // besoin d'au moins 2 joueurs

    const getWinner = (p: any) =>
      p.home_score_pred > p.away_score_pred
        ? "home"
        : p.away_score_pred > p.home_score_pred
        ? "away"
        : "draw";

    // Bonus +8 : seul avec le score exact
    const exactScore = preds.filter(
      (p) => p.home_score_pred === homeScore && p.away_score_pred === awayScore
    );
    if (exactScore.length === 1) {
      await supabase
        .from("predictions")
        .update({ points_earned: (exactScore[0].points_earned ?? 0) + 8 })
        .eq("id", exactScore[0].id);
      continue;
    }

    // Bonus +5 : seul avec le bon vainqueur
    const correctWinner = preds.filter((p) => getWinner(p) === realWinner);
    if (correctWinner.length === 1) {
      await supabase
        .from("predictions")
        .update({ points_earned: (correctWinner[0].points_earned ?? 0) + 5 })
        .eq("id", correctWinner[0].id);
    }
  }
}

// Scorer les pronostics spéciaux (Bonus 4)
export async function scoreTournamentPredictions(
  stage: string,
  advancingTeam: string,
  supabase: any
): Promise<void> {
  const stageNorm = stage.toLowerCase();

  const { data: allTPs } = await supabase
    .from("tournament_predictions")
    .select("id, semi1, semi2, semi3, semi4, winner, points_earned");

  if (!allTPs?.length) return;

  // Quarts de finale → +3 si l'équipe qualifiée est dans les 4 demi-finalistes prédits
  if (/quart/.test(stageNorm)) {
    for (const tp of allTPs) {
      const semis = [tp.semi1, tp.semi2, tp.semi3, tp.semi4].map((s: string) =>
        s?.toLowerCase().trim()
      );
      if (semis.some((s) => s === advancingTeam.toLowerCase().trim())) {
        await supabase
          .from("tournament_predictions")
          .update({ points_earned: (tp.points_earned ?? 0) + 3 })
          .eq("id", tp.id);
      }
    }
    return;
  }

  // Finale → +5 si les 2 finalistes étaient dans les semis prédits, +10 si vainqueur correct
  if (stageNorm.trim() === "finale") {
    const { data: sfMatches } = await supabase
      .from("matches")
      .select("home_team, away_team, home_score, away_score, penalty_winner")
      .eq("stage", "Demi-finales")
      .eq("status", "finished");

    const finalists: string[] = [];
    for (const sf of sfMatches ?? []) {
      const isHomeWin =
        sf.penalty_winner === "home" ||
        (!sf.penalty_winner && (sf.home_score ?? 0) > (sf.away_score ?? 0));
      finalists.push((isHomeWin ? sf.home_team : sf.away_team).toLowerCase().trim());
    }

    for (const tp of allTPs) {
      let bonus = 0;
      const semis = [tp.semi1, tp.semi2, tp.semi3, tp.semi4].map((s: string) =>
        s?.toLowerCase().trim()
      );

      // +5 si les 2 finalistes étaient dans les 4 semis prédits
      if (finalists.length === 2 && finalists.every((f) => semis.includes(f))) {
        bonus += 5;
      }

      // +10 si vainqueur correct
      if (tp.winner?.toLowerCase().trim() === advancingTeam.toLowerCase().trim()) {
        bonus += 10;
      }

      if (bonus > 0) {
        await supabase
          .from("tournament_predictions")
          .update({ points_earned: (tp.points_earned ?? 0) + bonus })
          .eq("id", tp.id);
      }
    }
  }
}
