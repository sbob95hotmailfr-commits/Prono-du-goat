// @ts-nocheck
// Endpoint one-shot : peuple penalty_winner sur les matchs DB déjà terminés
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const API_KEY = process.env.API_FOOTBALL_KEY;
  if (!API_KEY) return NextResponse.json({ error: "API_FOOTBALL_KEY manquant" }, { status: 500 });

  const apiRes = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
    headers: { "X-Auth-Token": API_KEY }, cache: "no-store",
  });
  if (!apiRes.ok) return NextResponse.json({ error: `API ${apiRes.status}` }, { status: 500 });
  const { matches: apiMatches } = await apiRes.json();

  // Indexer par ID
  const fixtureById = new Map(apiMatches.map((f: any) => [f.id, f]));

  // Récupérer les matchs terminés avec api_match_id mais sans penalty_winner
  const supabase = createAdminClient();
  const { data: dbMatches } = await supabase
    .from("matches")
    .select("id, api_match_id, home_team, away_team")
    .eq("status", "finished")
    .not("api_match_id", "is", null)
    .is("penalty_winner", null);

  let updated = 0;
  const details: string[] = [];

  for (const m of dbMatches ?? []) {
    const fix = fixtureById.get(Number(m.api_match_id));
    if (!fix) continue;

    // Un match aux TAB a score.penalties non nul
    if (!fix.score?.penalties) continue;

    const penWinner = fix.score.winner === "HOME_TEAM" ? "home" : "away";
    await supabase.from("matches")
      .update({ penalty_winner: penWinner })
      .eq("id", m.id);

    const winnerName = penWinner === "home" ? m.home_team : m.away_team;
    details.push(`${m.home_team} vs ${m.away_team} → ↑ ${winnerName} (TAB ${fix.score.penalties.home}-${fix.score.penalties.away})`);
    updated++;
  }

  return NextResponse.json({ success: true, updated, details });
}
