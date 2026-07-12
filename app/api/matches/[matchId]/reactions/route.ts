// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const leagueId = req.nextUrl.searchParams.get("leagueId");
  if (!leagueId) return NextResponse.json({ error: "leagueId requis" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: reactions } = await admin
    .from("match_reactions")
    .select("emoji, user_id")
    .eq("match_id", matchId)
    .eq("league_id", leagueId);

  // Grouper par emoji avec counts + si user a réagi
  const grouped: Record<string, { count: number; reacted: boolean }> = {};
  for (const r of reactions ?? []) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, reacted: false };
    grouped[r.emoji].count++;
    if (r.user_id === user.id) grouped[r.emoji].reacted = true;
  }

  return NextResponse.json({ reactions: grouped });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { leagueId, emoji } = await req.json();
  const ALLOWED = ["🔥", "😱", "👏", "😤", "🎯"];
  if (!leagueId || !ALLOWED.includes(emoji)) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const admin = createAdminClient();

  // Toggle : supprimer si déjà présent, ajouter sinon
  const { data: existing } = await admin
    .from("match_reactions")
    .select("id")
    .eq("match_id", matchId)
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .single();

  if (existing) {
    await admin.from("match_reactions").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  } else {
    await admin.from("match_reactions").insert({ match_id: matchId, league_id: leagueId, user_id: user.id, emoji });
    return NextResponse.json({ action: "added" });
  }
}
