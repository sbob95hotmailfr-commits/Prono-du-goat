/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { AdminScorerManager } from "@/components/admin-scorer-manager";

export const revalidate = 0;

export default async function AdminScorersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: adminLeagues } = await supabase
    .from("leagues")
    .select("id")
    .eq("admin_id", user.id);

  if (!adminLeagues?.length) redirect("/dashboard");

  const admin = createAdminClient();

  const [{ data: matchesRaw }, { data: playersRaw }, { data: scorersRaw }] = await Promise.all([
    admin
      .from("matches")
      .select("id, home_team, away_team, home_flag, away_flag, home_score, away_score, kickoff_at")
      .eq("status", "finished")
      .not("home_score", "is", null)
      .order("kickoff_at", { ascending: false }),
    admin
      .from("players")
      .select("id, name, team_name")
      .order("name", { ascending: true }),
    admin
      .from("match_scorers")
      .select("match_id, player_id"),
  ]);

  // Grouper les buteurs par match_id
  const scorersByMatch: Record<string, string[]> = {};
  for (const s of scorersRaw ?? []) {
    if (!scorersByMatch[s.match_id]) scorersByMatch[s.match_id] = [];
    scorersByMatch[s.match_id].push(s.player_id);
  }

  const matches = (matchesRaw ?? []).map((m: any) => ({
    id: m.id,
    home_team: m.home_team,
    away_team: m.away_team,
    home_flag: m.home_flag,
    away_flag: m.away_flag,
    home_score: m.home_score,
    away_score: m.away_score,
    currentScorerIds: scorersByMatch[m.id] ?? [],
  }));

  const players = (playersRaw ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    team_name: p.team_name,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-dark">Saisie des buteurs</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/matches" className="text-sm text-muted hover:text-dark">
            ← Scores
          </Link>
          <BackButton fallback="/admin" className="text-sm text-muted hover:text-dark" />
        </div>
      </div>
      <p className="text-sm text-muted mb-6">
        Clique sur un match pour ajouter ou modifier ses buteurs. Les bonus sont recalculés automatiquement à la sauvegarde.
      </p>

      {matches.length === 0 ? (
        <div className="card p-6 text-center text-muted text-sm">Aucun match terminé</div>
      ) : (
        <AdminScorerManager matches={matches} players={players} />
      )}
    </div>
  );
}
