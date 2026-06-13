// @ts-nocheck
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Vérifier que l'utilisateur est admin d'au moins une ligue
  const { data: adminLeagues } = await supabase
    .from("leagues")
    .select("id")
    .eq("admin_id", user.id);

  if (!adminLeagues?.length) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { matchId, homeScore, awayScore } = await request.json();

  if (typeof homeScore !== "number" || typeof awayScore !== "number") {
    return NextResponse.json({ error: "Scores invalides" }, { status: 400 });
  }

  // Client admin pour bypasser RLS (service role key, sans cookies)
  const adminSupabase = createAdminClient();

  // Mettre à jour le score
  const { error: updateError } = await adminSupabase
    .from("matches")
    .update({ home_score: homeScore, away_score: awayScore, status: "finished" as const })
    .eq("id", matchId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Calculer les points via la fonction SQL
  const { error: rpcError } = await adminSupabase
    .rpc("calculate_points_for_match", { p_match_id: matchId });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
