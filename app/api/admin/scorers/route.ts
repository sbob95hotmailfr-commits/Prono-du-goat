// @ts-nocheck
// Admin : saisir les buteurs réels d'un match + calcul des bonus multi-slots
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculateScorerBonusMulti } from "@/lib/points";
import { checkAndAwardBadges } from "@/lib/badges";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: adminLeagues } = await adminSupabase
    .from("leagues").select("id").eq("admin_id", user.id);

  if (!adminLeagues?.length) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const { matchId, scorerIds } = body;

  if (!matchId || !Array.isArray(scorerIds)) {
    return NextResponse.json({ error: "matchId et scorerIds (array) requis" }, { status: 400 });
  }

  // Sauvegarde les buteurs réels (reset + insert)
  await adminSupabase.from("match_scorers").delete().eq("match_id", matchId);
  for (const playerId of scorerIds) {
    await adminSupabase.from("match_scorers").insert({ match_id: matchId, player_id: playerId });
  }

  // Récupère tous les prediction_id liés à ce match
  const { data: userPreds } = await adminSupabase
    .from("predictions")
    .select("id, user_id, league_id")
    .eq("match_id", matchId);

  if (!userPreds?.length) {
    return NextResponse.json({ success: true, scorersAdded: scorerIds.length, bonusUpdated: 0 });
  }

  const predIds = userPreds.map((p) => p.id);
  const predMeta = Object.fromEntries(userPreds.map((p) => [p.id, { user_id: p.user_id, league_id: p.league_id }]));

  // Récupère TOUS les pronostics buteur pour ce match (multi-slots)
  const { data: scorerPreds } = await adminSupabase
    .from("scorer_predictions")
    .select("prediction_id, player_id")
    .in("prediction_id", predIds);

  // Grouper par prediction_id → liste de joueurs prédits
  const byPred: Record<string, string[]> = {};
  for (const sp of scorerPreds ?? []) {
    if (!byPred[sp.prediction_id]) byPred[sp.prediction_id] = [];
    if (sp.player_id) byPred[sp.prediction_id].push(sp.player_id);
  }

  let bonusUpdated = 0;

  for (const predId of Object.keys(byPred)) {
    const predictedIds = byPred[predId];
    const bonus = calculateScorerBonusMulti(predictedIds, scorerIds);

    // Mettre à jour le bonus sur toutes les lignes de cette prédiction
    await adminSupabase
      .from("scorer_predictions")
      .update({ bonus_earned: bonus })
      .eq("prediction_id", predId);

    // Vérifier les badges
    const meta = predMeta[predId];
    if (meta?.user_id && meta?.league_id) {
      await checkAndAwardBadges(meta.user_id, meta.league_id);
    }

    bonusUpdated++;
  }

  return NextResponse.json({ success: true, scorersAdded: scorerIds.length, bonusUpdated });
}
