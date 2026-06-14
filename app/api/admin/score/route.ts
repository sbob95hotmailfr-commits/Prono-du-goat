// @ts-nocheck
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: adminLeagues } = await supabase
    .from("leagues").select("id").eq("admin_id", user.id);

  if (!adminLeagues?.length) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { matchId, homeScore, awayScore } = await request.json();

  if (typeof homeScore !== "number" || typeof awayScore !== "number") {
    return NextResponse.json({ error: "Scores invalides" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // 1. Mettre à jour le match
  const { error: updateError } = await adminSupabase
    .from("matches")
    .update({ home_score: homeScore, away_score: awayScore, status: "finished" })
    .eq("id", matchId);

  if (updateError) {
    return NextResponse.json({ error: "Erreur mise à jour match: " + updateError.message }, { status: 500 });
  }

  // 2. Récupérer tous les pronostics pour ce match
  const { data: predictions, error: predError } = await adminSupabase
    .from("predictions")
    .select("id, home_score_pred, away_score_pred")
    .eq("match_id", matchId);

  if (predError) {
    return NextResponse.json({ error: "Erreur lecture pronostics: " + predError.message }, { status: 500 });
  }

  // 3. Calculer et mettre à jour les points pour chaque pronostic
  for (const pred of (predictions ?? [])) {
    let points = 0;

    if (pred.home_score_pred === homeScore && pred.away_score_pred === awayScore) {
      // Score exact → 3 points
      points = 3;
    } else if (
      (pred.home_score_pred > pred.away_score_pred && homeScore > awayScore) ||
      (pred.home_score_pred < pred.away_score_pred && homeScore < awayScore) ||
      (pred.home_score_pred === pred.away_score_pred && homeScore === awayScore)
    ) {
      // Bon résultat → 1 point
      points = 1;
    }

    await adminSupabase
      .from("predictions")
      .update({ points_earned: points, is_locked: true })
      .eq("id", pred.id);
  }

  return NextResponse.json({ success: true });
}
