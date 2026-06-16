// @ts-nocheck
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculatePoints } from "@/lib/points";

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

  const body = await request.json();
  const { matchId } = body;
  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);

  if (isNaN(homeScore) || isNaN(awayScore) || !matchId) {
    return NextResponse.json({ error: `Données invalides: matchId=${matchId} homeScore=${homeScore} awayScore=${awayScore}` }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // 1. Mettre à jour le match
  const { error: updateError, count } = await adminSupabase
    .from("matches")
    .update({ home_score: homeScore, away_score: awayScore, status: "finished" })
    .eq("id", matchId);

  if (updateError) {
    return NextResponse.json({ error: "Erreur UPDATE match: " + updateError.message }, { status: 500 });
  }

  // 2. Récupérer les pronostics pour ce match
  const { data: predictions, error: predError } = await adminSupabase
    .from("predictions")
    .select("id, home_score_pred, away_score_pred")
    .eq("match_id", matchId);

  if (predError) {
    return NextResponse.json({ error: "Erreur lecture pronostics: " + predError.message }, { status: 500 });
  }

  // 3. Calculer et mettre à jour les points pour chaque pronostic
  const updates = (predictions ?? []).map((pred) => {
    const points = calculatePoints(
      pred.home_score_pred,
      pred.away_score_pred,
      homeScore,
      awayScore
    );
    return adminSupabase
      .from("predictions")
      .update({ points_earned: points, is_locked: true })
      .eq("id", pred.id);
  });

  await Promise.all(updates);

  return NextResponse.json({ success: true, updated: predictions?.length ?? 0 });
}
