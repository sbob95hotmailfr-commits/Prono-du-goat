// @ts-nocheck
export const dynamic = "force-dynamic";
// Enregistre les slash commands Discord — à appeler une seule fois (ou après modification des commandes)
// POST /api/admin/register-discord-commands
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registerSlashCommands } from "@/lib/discord";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single() as any;
  if (!profile?.is_admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_APP_ID || !process.env.DISCORD_GUILD_ID) {
    return NextResponse.json({ error: "Variables Discord manquantes (BOT_TOKEN, APP_ID, GUILD_ID)" }, { status: 500 });
  }

  try {
    const result = await registerSlashCommands();
    return NextResponse.json({ success: true, commands: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
