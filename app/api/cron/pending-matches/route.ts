// @ts-nocheck
export const dynamic = "force-dynamic";
// Retourne les matchs récemment terminés qui n'ont pas encore leurs buteurs
// Appelé par l'agent pour savoir ce qu'il doit synchroniser
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Matchs terminés dans les 30 dernières heures
  const since = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();

  const { data: recentFinished } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, kickoff_at, stage, penalty_winner")
    .eq("status", "finished")
    .gt("kickoff_at", since)
    .not("home_score", "is", null)
    .order("kickoff_at", { ascending: false });

  if (!recentFinished?.length) {
    return NextResponse.json({
      needs_scorers: [],
      already_synced: [],
      message: "Aucun match récent à synchroniser",
    });
  }

  // Identifier lesquels ont déjà des buteurs
  const matchIds = recentFinished.map((m: any) => m.id);
  const { data: existingScorers } = await supabase
    .from("match_scorers")
    .select("match_id")
    .in("match_id", matchIds);

  const withScorers = new Set((existingScorers ?? []).map((s: any) => s.match_id));

  const needsScorers = recentFinished
    .filter((m: any) => !withScorers.has(m.id))
    .map((m: any) => ({
      home_team: m.home_team,
      away_team: m.away_team,
      home_score: m.home_score,
      away_score: m.away_score,
      kickoff_at: m.kickoff_at,
      stage: m.stage,
      has_penalties: m.penalty_winner != null,
    }));

  const alreadySynced = recentFinished
    .filter((m: any) => withScorers.has(m.id))
    .map((m: any) => `${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}`);

  return NextResponse.json({ needs_scorers: needsScorers, already_synced: alreadySynced });
}
