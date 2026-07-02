/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const revalidate = 60;

export default async function AdminHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: adminLeagues } = await supabase
    .from("leagues")
    .select("id")
    .eq("admin_id", user.id);

  if (!adminLeagues?.length) redirect("/dashboard");

  const admin = createAdminClient();

  // Global stats
  const [
    { count: totalUsers },
    { count: totalPredictions },
    { count: totalMatches },
    { data: allLeagues },
    { data: upcomingMatches },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("predictions").select("*", { count: "exact", head: true }),
    admin.from("matches").select("*", { count: "exact", head: true }),
    admin.from("leagues").select("id, name, code, created_at").eq("admin_id", user.id).order("created_at", { ascending: false }),
    admin.from("matches").select("id, home_team, away_team, kickoff_at, status, home_score, away_score, home_flag, away_flag")
      .neq("status", "finished").order("kickoff_at", { ascending: true }).limit(5),
  ]);

  // Member count per league
  const leagueIds = (allLeagues ?? []).map((l: any) => l.id);
  let memberCounts: Record<string, number> = {};
  if (leagueIds.length > 0) {
    const { data: members } = await admin
      .from("league_members")
      .select("league_id")
      .in("league_id", leagueIds);
    (members ?? []).forEach((m: any) => {
      memberCounts[m.league_id] = (memberCounts[m.league_id] ?? 0) + 1;
    });
  }

  const kpiCards = [
    { label: "Utilisateurs", value: totalUsers ?? 0, color: "#003DA5" },
    { label: "Pronostics", value: totalPredictions ?? 0, color: "#F5A623" },
    { label: "Matchs totaux", value: totalMatches ?? 0, color: "#00A650" },
    { label: "Mes ligues", value: (allLeagues ?? []).length, color: "#E8192C" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0A1628" }}>
      {/* Header */}
      <div style={{ background: "#000" }} className="px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: "#555" }}>
              COUPE DU MONDE DE LA FIFA 2026™
            </p>
            <p className="font-bold text-white text-sm">Admin Dashboard</p>
          </div>
          <Link href="/dashboard" className="text-xs text-gray-500 hover:text-white transition-colors">
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide" style={{ color }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-4 py-3" style={{ background: "#0D1B2E" }}>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Actions rapides</p>
          </div>
          <div className="p-4 flex flex-wrap gap-3">
            <Link
              href="/admin/matches"
              className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg"
              style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }}
            >
              ⚽ Saisie des scores
            </Link>
          </div>
        </div>

        {/* Upcoming matches */}
        {(upcomingMatches ?? []).length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-4 py-3" style={{ background: "#0D1B2E" }}>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Prochains matchs sans score</p>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {(upcomingMatches ?? []).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {m.home_flag} {m.home_team} vs {m.away_flag} {m.away_team}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(m.kickoff_at)}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    background: m.status === "live" ? "rgba(0,166,80,0.2)" : "rgba(0,61,165,0.2)",
                    color: m.status === "live" ? "#00A650" : "#60a5fa"
                  }}>
                    {m.status === "live" ? "🔴 En cours" : m.status === "finished" ? "Terminé" : "À venir"}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3">
              <Link href="/admin/matches" className="text-xs font-semibold" style={{ color: "#F5A623" }}>
                Gérer tous les matchs →
              </Link>
            </div>
          </div>
        )}

        {/* My leagues management */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-4 py-3" style={{ background: "#0D1B2E" }}>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Mes ligues</p>
          </div>
          {(allLeagues ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-gray-500">Aucune ligue créée</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {(allLeagues ?? []).map((league: any) => (
                <div key={league.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{league.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Code: <span className="font-mono text-gray-400">{league.code}</span>
                      {" · "}{memberCounts[league.id] ?? 0} membre{(memberCounts[league.id] ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>
                  <Link
                    href={`/leagues/${league.id}/admin`}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(0,61,165,0.2)", color: "#60a5fa", border: "1px solid rgba(0,61,165,0.3)" }}
                  >
                    Gérer →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
