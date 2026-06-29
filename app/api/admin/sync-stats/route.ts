// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: adminLeagues } = await adminSupabase
    .from("leagues").select("id").eq("admin_id", user.id);
  if (!adminLeagues?.length) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const API_KEY = process.env.API_FOOTBALL_KEY;
  if (!API_KEY) return NextResponse.json({ error: "API_FOOTBALL_KEY manquant" }, { status: 500 });

  // Récupérer le classement des buteurs WC 2026 (limit=100 pour couvrir un maximum de joueurs)
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/scorers?limit=100",
    { headers: { "X-Auth-Token": API_KEY }, cache: "no-store" }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    return NextResponse.json({ error: "Erreur API", details: errData }, { status: 502 });
  }

  const data = await res.json();
  const scorers = data.scorers ?? [];

  if (!scorers.length) {
    return NextResponse.json({ success: true, message: "Aucun buteur disponible pour le moment", updated: 0 });
  }

  // Récupérer tous nos joueurs avec leur api_football_id (= id football-data.org)
  const { data: dbPlayers } = await adminSupabase
    .from("players")
    .select("id, api_football_id, name");

  const playerByApiId = new Map((dbPlayers ?? []).map((p: any) => [p.api_football_id, p.id]));

  // Reconstruire player_stats depuis l'endpoint scorers
  let matched = 0;
  let unmatched: string[] = [];
  const rows: { player_id: string; goals: number; assists: number; matches_played: number }[] = [];

  for (const s of scorers) {
    const apiPlayerId = s.player?.id;
    const dbPlayerId = playerByApiId.get(apiPlayerId);

    if (!dbPlayerId) {
      unmatched.push(s.player?.name ?? "?");
      continue;
    }

    rows.push({
      player_id: dbPlayerId,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      matches_played: s.playedMatches ?? 0,
    });
    matched++;
  }

  // Remplacer player_stats par les données fraîches
  await adminSupabase.from("player_stats").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (rows.length) {
    await adminSupabase.from("player_stats").insert(rows);
  }

  return NextResponse.json({
    success: true,
    scorers_from_api: scorers.length,
    matched,
    unmatched_count: unmatched.length,
    unmatched_sample: unmatched.slice(0, 10),
  });
}
