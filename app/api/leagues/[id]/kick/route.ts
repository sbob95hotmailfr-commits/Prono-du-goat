import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId requis" }, { status: 400 });

  // Verify caller is league admin
  const { data: league } = await supabase
    .from("leagues")
    .select("admin_id")
    .eq("id", id)
    .single() as any;

  if (!league || (league as any).admin_id !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Cannot kick self
  if (userId === user.id) {
    return NextResponse.json({ error: "Impossible de se retirer soi-même" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("league_members")
    .delete()
    .eq("league_id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
