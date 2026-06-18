// @ts-nocheck
// Admin : saisir les buteurs réels d'un match + calcul des bonus
// Protégé par vérification admin (service role)
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculateScorerBonus } from "@/lib/points";
import { checkAndAwardBadges } from "@/lib/badges";

export async function POST(req: NextRequest) {
  // Vérifie que l'appelant est bien admin d'une ligue
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: adminLeagues } = await adminSupabase
    .from("leagues")
    .select("id")
    .eq("admin_id", user.id);

  if (!adminLeagues?.length) {
    return NextResponse.json(
      { error: "Accès refusé — tu n'es admin d'aucune ligue" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { matchId, scorerIds } = body;

  if (!matchId || !Array.isArray(scorerIds)) {
    return NextResponse.json(
      { error: "matchId (string) et scorerIds (array) requis" },
      { status: 400 }
    );
  }

  // Insère les buteurs réels (delete+insert pour reset propre)
  await adminSupabase
    .from("match_scorers")
    .delete()
    .eq("match_id", matchId);

  for (const playerId of scorerIds) {
    await adminSupabase.from("match_scorers").insert({
      match_id: matchId,
      player_id: playerId,
    });
  }

  // Récupère tous les pronostics buteur liés à ce match
  const { data: userPredIds } = await adminSupabase
    .from("predictions")
    .select("id")
    .eq("match_id", matchId);

  if (!userPredIds?.length) {
    return NextResponse.json({ success: true, scorersAdded: scorerIds.length, bonusUpdated: 0 });
  }

  const predIds = userPredIds.map((p) => p.id);

  const { data: scorerPreds } = await adminSupabase
    .from("scorer_predictions")
    .select("id, player_id, prediction_id, predictions(user_id, league_id)")
    .in("prediction_id", predIds);

  let bonusUpdated = 0;

  // Calcule et met à jour le bonus pour chaque pronostic buteur
  for (const pred of scorerPreds ?? []) {
    const bonus = calculateScorerBonus(pred.player_id, scorerIds);
    await adminSupabase
      .from("scorer_predictions")
      .update({ bonus_earned: bonus })
      .eq("id", pred.id);

    // Vérifie les badges si l'utilisateur a marqué un bonus
    const p = pred.predictions as { user_id: string; league_id: string } | null;
    if (p?.user_id && p?.league_id) {
      await checkAndAwardBadges(p.user_id, p.league_id);
    }

    bonusUpdated++;
  }

  return NextResponse.json({
    success: true,
    scorersAdded: scorerIds.length,
    bonusUpdated,
  });
}
