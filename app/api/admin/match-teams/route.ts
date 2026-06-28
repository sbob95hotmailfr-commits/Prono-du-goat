// @ts-nocheck
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: adminLeagues } = await adminSupabase
    .from("leagues").select("id").eq("admin_id", user.id);

  if (!adminLeagues?.length) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { matchId, homeTeam, awayTeam } = await request.json();
  if (!matchId || !homeTeam || !awayTeam) {
    return NextResponse.json({ error: "matchId, homeTeam et awayTeam requis" }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from("matches")
    .update({ home_team: homeTeam.trim(), away_team: awayTeam.trim() })
    .eq("id", matchId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
