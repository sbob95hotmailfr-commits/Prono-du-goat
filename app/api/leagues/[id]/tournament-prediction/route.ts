// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("tournament_predictions")
    .select("*")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ prediction: data ?? null });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Vérifier que le premier QF n'a pas encore commencé
  const { data: firstQF } = await supabase
    .from("matches")
    .select("kickoff_at, status")
    .eq("stage", "Quarts de finale")
    .order("kickoff_at")
    .limit(1)
    .single();

  if (firstQF && (firstQF.status !== "upcoming" || new Date(firstQF.kickoff_at) <= new Date())) {
    return NextResponse.json({ error: "Les quarts de finale ont déjà commencé." }, { status: 403 });
  }

  const { semi1, semi2, semi3, semi4, winner } = await req.json();
  if (!semi1 || !semi2 || !semi3 || !semi4 || !winner) {
    return NextResponse.json({ error: "Données incomplètes." }, { status: 400 });
  }

  const { error } = await supabase.from("tournament_predictions").upsert({
    user_id: user.id,
    league_id: leagueId,
    semi1, semi2, semi3, semi4, winner,
  }, { onConflict: "user_id,league_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
