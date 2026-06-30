/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { WcNav } from "@/components/wc-nav";

export const revalidate = 60;

export default async function TournamentStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("league_members").select("*")
    .eq("league_id", id).eq("user_id", user.id).single() as any;
  if (!membership) notFound();

  const { data: league } = await supabase
    .from("leagues").select("*").eq("id", id).single() as any;
  if (!league) notFound();

  const isAdmin = (league as any).admin_id === user.id;

  const adminSupabase = createAdminClient();

  // Top buteurs du tournoi
  const { data: topScorersRaw } = await adminSupabase
    .from("player_stats")
    .select("goals, assists, matches_played, players(name, team_name, position)")
    .order("goals", { ascending: false })
    .limit(20) as any;
  const topScorers = (topScorersRaw ?? []).filter((s: any) => s.goals > 0);

  // Stats globales du tournoi (nombre de buts marqués)
  const { data: finishedMatches } = await adminSupabase
    .from("matches")
    .select("home_score, away_score")
    .eq("status", "finished") as any;

  const totalGoals = (finishedMatches ?? []).reduce(
    (sum: number, m: any) => sum + (m.home_score ?? 0) + (m.away_score ?? 0),
    0
  );
  const totalMatches = (finishedMatches ?? []).length;
  const avgGoalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : "–";

  return (
    <div className="min-h-screen" style={{ background: "#0A1628" }}>
      <WcNav
        leagueId={id}
        leagueName={(league as any).name}
        code={(league as any).code}
        isAdmin={isAdmin}
        activeTab="tournament-stats"
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* KPIs tournoi */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { val: totalMatches, label: "Matchs joués", color: "#003DA5" },
            { val: totalGoals, label: "Buts marqués", color: "#F5A623" },
            { val: avgGoalsPerMatch, label: "Buts / match", color: "#00A650" },
          ].map(({ val, label, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-2xl font-bold" style={{ color }}>{val}</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* Top buteurs */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-4 py-3" style={{ background: "#0D1B2E" }}>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">⚽ Meilleurs buteurs du tournoi</p>
          </div>

          {topScorers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm">Aucun buteur enregistré pour le moment.</p>
              <p className="text-gray-600 text-xs mt-1">Les statistiques seront disponibles après la mise à jour des données.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {topScorers.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-bold w-6 text-center" style={{
                    color: i === 0 ? "#F5A623" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#6b7280"
                  }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{s.players?.name}</p>
                    <p className="text-[10px] text-gray-500">{s.players?.team_name} · {s.players?.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold" style={{ color: "#F5A623" }}>{s.goals} ⚽</p>
                    {s.assists > 0 && (
                      <p className="text-[10px] text-gray-500">{s.assists} passe{s.assists > 1 ? "s" : ""} D</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
