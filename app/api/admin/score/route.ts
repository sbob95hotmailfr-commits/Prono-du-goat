// @ts-nocheck
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculatePoints } from "@/lib/points";

export async function POST(request: Request) {
  // Vérifier l'authentification avec le client normal
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Utiliser adminSupabase pour tout (bypass RLS garanti)
  const adminSupabase = createAdminClient();

  // Vérifier que l'utilisateur est admin d'au moins une ligue
  const { data: adminLeagues, error: leagueError } = await adminSupabase
    .from("leagues").select("id").eq("admin_id", user.id);

  if (leagueError || !adminLeagues?.length) {
    return NextResponse.json({ error: "Accès refusé — tu n'es admin d'aucune ligue" }, { status: 403 });
  }

  const body = await request.json();
  const { matchId, winner } = body;
  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);

  if (!matchId || isNaN(homeScore) || isNaN(awayScore)) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  // Mettre à jour le match (score + status finished)
  const { error: updateError } = await adminSupabase
    .from("matches")
    .update({ home_score: homeScore, away_score: awayScore, status: "finished" })
    .eq("id", matchId);

  if (updateError) {
    return NextResponse.json({ error: "Erreur mise à jour match : " + updateError.message }, { status: 500 });
  }

  // Récupérer tous les pronostics pour ce match
  const { data: predictions, error: predError } = await adminSupabase
    .from("predictions")
    .select("id, home_score_pred, away_score_pred")
    .eq("match_id", matchId);

  if (predError) {
    return NextResponse.json({ error: "Erreur lecture pronostics : " + predError.message }, { status: 500 });
  }

  if (!predictions?.length) {
    return NextResponse.json({ success: true, updated: 0, message: "Score enregistré — aucun pronostic à calculer" });
  }

  // Récupère les bonus buteur existants pour ne pas les écraser
  const predIds = predictions.map((p) => p.id);
  const { data: scorerBonuses } = await adminSupabase
    .from("scorer_predictions")
    .select("prediction_id, bonus_earned")
    .in("prediction_id", predIds);

  const bonusMap: Record<string, number> = {};
  for (const sb of scorerBonuses ?? []) {
    if (!(sb.prediction_id in bonusMap)) bonusMap[sb.prediction_id] = sb.bonus_earned ?? 0;
  }

  // Calculer et mettre à jour les points pour chaque pronostic
  const results = await Promise.allSettled(
    predictions.map((pred) => {
      const scorePoints = calculatePoints(
        pred.home_score_pred,
        pred.away_score_pred,
        homeScore,
        awayScore
      );
      const scorerBonus = bonusMap[pred.id] ?? 0;
      return adminSupabase
        .from("predictions")
        .update({ points_earned: scorePoints + scorerBonus, is_locked: true })
        .eq("id", pred.id);
    })
  );

  const failures = results.filter((r) => r.status === "rejected").length;
  if (failures > 0) {
    return NextResponse.json({
      error: `Score enregistré mais ${failures} pronostic(s) n'ont pas pu être mis à jour`
    }, { status: 207 });
  }

  // Propagation automatique du gagnant dans le tour suivant
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

  const { data: matchInfo } = await adminSupabase
    .from("matches")
    .select("stage, home_team, away_team")
    .eq("id", matchId)
    .single();

  if (matchInfo && NEXT_STAGE[matchInfo.stage]) {
    const nextStage = NEXT_STAGE[matchInfo.stage];
    const prefix = PLACEHOLDER_PREFIX[matchInfo.stage];

    const { data: stageMatches } = await adminSupabase
      .from("matches")
      .select("id, kickoff_at")
      .eq("stage", matchInfo.stage)
      .order("kickoff_at", { ascending: true });

    const slot = (stageMatches ?? []).findIndex((m) => m.id === matchId) + 1;

    if (slot > 0) {
      // Utilise le vainqueur explicite (tirs au but) ou le score sinon
      const matchWinner = winner ?? (homeScore > awayScore ? matchInfo.home_team : matchInfo.away_team);
      const placeholder = `Vainqueur ${prefix}${slot}`;

      await adminSupabase
        .from("matches")
        .update({ home_team: matchWinner })
        .eq("stage", nextStage)
        .eq("home_team", placeholder);

      await adminSupabase
        .from("matches")
        .update({ away_team: matchWinner })
        .eq("stage", nextStage)
        .eq("away_team", placeholder);
    }
  }

  return NextResponse.json({ success: true, updated: predictions.length });
}
