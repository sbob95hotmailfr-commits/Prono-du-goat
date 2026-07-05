// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Toutes les équipes des Huitièmes de finale (les 16 équipes qualifiées)
  const { data: r16Matches } = await supabase
    .from("matches")
    .select("home_team, away_team, home_score, away_score, penalty_winner, status")
    .eq("stage", "Huitièmes de finale")
    .order("kickoff_at");

  const teams: string[] = [];
  for (const m of r16Matches ?? []) {
    if (m.status === "finished") {
      // Seul le vainqueur est encore en lice
      const isHomeWin =
        m.penalty_winner === "home" ||
        (!m.penalty_winner && (m.home_score ?? 0) > (m.away_score ?? 0));
      teams.push(isHomeWin ? m.home_team : m.away_team);
    } else {
      // Match pas encore joué → les 2 équipes sont potentiellement qualifiables
      if (m.home_team && !m.home_team.startsWith("Vainqueur")) teams.push(m.home_team);
      if (m.away_team && !m.away_team.startsWith("Vainqueur")) teams.push(m.away_team);
    }
  }

  // Locked si le premier QF a commencé
  const { data: firstQF } = await supabase
    .from("matches")
    .select("kickoff_at, status")
    .eq("stage", "Quarts de finale")
    .order("kickoff_at")
    .limit(1)
    .single();

  const locked = firstQF && (firstQF.status !== "upcoming" || new Date(firstQF.kickoff_at) <= new Date());

  return NextResponse.json({ teams: [...new Set(teams)].sort(), locked: !!locked });
}
