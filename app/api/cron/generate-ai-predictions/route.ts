// @ts-nocheck
export const dynamic = "force-dynamic";
// Génère les pronostics IA (GOAT IA) pour les matchs à venir dans les 48h
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateAiPrediction } from "@/lib/ai-predictor";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: upcoming } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at, stage")
    .eq("status", "upcoming")
    .gt("kickoff_at", new Date().toISOString())
    .lt("kickoff_at", new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString())
    .order("kickoff_at");

  if (!upcoming?.length) {
    return NextResponse.json({ success: true, generated: 0, message: "Aucun match à venir dans les 48h" });
  }

  const results: any[] = [];
  for (const m of upcoming) {
    const result = await generateAiPrediction(m.id);
    results.push({ match: `${m.home_team} vs ${m.away_team}`, ...result });
  }

  return NextResponse.json({
    success: true,
    generated: results.filter((r) => r.success).length,
    results,
  });
}
