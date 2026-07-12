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
  const { data: comments } = await admin
    .from("match_comments")
    .select("id, content, created_at, user_id, profiles(username)")
    .eq("match_id", matchId)
    .eq("league_id", leagueId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ comments: comments ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { leagueId, content } = await req.json();
  if (!leagueId || !content?.trim()) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  if (content.length > 280) return NextResponse.json({ error: "Commentaire trop long (280 max)" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("match_comments").insert({
    match_id: matchId,
    league_id: leagueId,
    user_id: user.id,
    content: content.trim(),
  }).select("id, content, created_at, user_id, profiles(username)").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { commentId } = await req.json();
  const admin = createAdminClient();
  await admin.from("match_comments").delete().eq("id", commentId).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
