// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmbed, buildReminderEmbed } from "@/lib/discord";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channelId = process.env.DISCORD_REMINDERS_CHANNEL_ID;
  if (!channelId || !process.env.DISCORD_BOT_TOKEN) {
    return NextResponse.json({ skipped: true, reason: "Discord non configuré" });
  }

  const supabase = createAdminClient();

  // Matchs dans les 65-55 prochaines minutes (fenêtre 10 min pour éviter les doublons)
  const windowStart = new Date(Date.now() + 55 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + 65 * 60 * 1000).toISOString();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at, stage")
    .eq("status", "upcoming")
    .gt("kickoff_at", windowStart)
    .lt("kickoff_at", windowEnd);

  let sent = 0;
  for (const m of matches ?? []) {
    try {
      await sendEmbed(channelId, buildReminderEmbed(m, 60));
      sent++;
    } catch {}
  }

  return NextResponse.json({ success: true, sent });
}
