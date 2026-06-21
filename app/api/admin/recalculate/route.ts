// @ts-nocheck
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculatePoints } from "@/lib/points";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  const { data: adminLeagues } = await adminSupabase
    .from("leagues").select("id").eq("admin_id", user.id);

  if (!adminLeagues?.length) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Récupérer tous les matchs terminés avec un score
  const { data: finishedMatches, error: matchError } = await adminSupabase
    .from("matches")
    .select("id, home_score, away_score")
    .eq("status", "finished")
    .not("home_score", "is", null);

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  if (!finishedMatches?.length) {
    return NextResponse.json({ message: "Aucun match terminé à recalculer", updated: 0 });
  }

  let totalUpdated = 0;
  let totalErrors = 0;

  for (const match of finishedMatches) {
    const { data: predictions } = await adminSupabase
      .from("predictions")
      .select("id, home_score_pred, away_score_pred")
      .eq("match_id", match.id);

    if (!predictions?.length) continue;

    // Récupère les bonus buteur existants pour ces prédictions (toutes les lignes ont le même bonus_earned)
    const predIdList = predictions.map((p) => p.id);
    const { data: allScorerBonuses } = await adminSupabase
      .from("scorer_predictions")
      .select("prediction_id, bonus_earned")
      .in("prediction_id", predIdList);

    // Prend le bonus de la première ligne trouvée par prédiction (toutes ont la même valeur)
    const bonusMap: Record<string, number> = {};
    for (const sb of allScorerBonuses ?? []) {
      if (!(sb.prediction_id in bonusMap)) {
        bonusMap[sb.prediction_id] = sb.bonus_earned ?? 0;
      }
    }

    const results = await Promise.allSettled(
      predictions.map((pred) => {
        const scorePoints = calculatePoints(
          pred.home_score_pred,
          pred.away_score_pred,
          match.home_score,
          match.away_score
        );
        const scorerBonus = bonusMap[pred.id] ?? 0;
        return adminSupabase
          .from("predictions")
          .update({ points_earned: scorePoints + scorerBonus, is_locked: true })
          .eq("id", pred.id);
      })
    );

    totalUpdated += results.filter((r) => r.status === "fulfilled").length;
    totalErrors += results.filter((r) => r.status === "rejected").length;
  }

  return NextResponse.json({
    success: true,
    matchesProcessed: finishedMatches.length,
    predictionsUpdated: totalUpdated,
    errors: totalErrors,
  });
}
