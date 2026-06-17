/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CopyCode } from "@/components/copy-code";
import { isMatchLocked } from "@/lib/utils";
import { MatchCard } from "@/components/match-card";
import type { LeagueStanding } from "@/types/database";

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: standingsData } = await supabase
    .from("league_standings").select("*").eq("league_id", id)
    .order("total_points", { ascending: false }) as any;

  const standings = (standingsData ?? []) as LeagueStanding[];

  const { data: matches } = await supabase
    .from("matches").select("*")
    .order("kickoff_at", { ascending: true }) as any;

  const { data: userPredictions } = await supabase
    .from("predictions").select("match_id")
    .eq("user_id", user.id).eq("league_id", id) as any;

  const predictedMatchIds = new Set((userPredictions ?? []).map((p: any) => p.match_id));

  const now = new Date();
  const allMatches = (matches as any[]) ?? [];
  const finishedMatches = allMatches.filter((m: any) => m.status === "finished");
  const liveMatches = allMatches.filter((m: any) => m.status === "live");
  const upcomingMatches = allMatches.filter(
    (m: any) => m.status === "upcoming" && new Date(m.kickoff_at) > now
  );
  const pendingMatches = allMatches.filter(
    (m: any) => m.status === "upcoming" && new Date(m.kickoff_at) <= now
  );

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
  const isAdmin = (league as any).admin_id === user.id;

  return (
    <div className="min-h-screen bg-[#F0F2F5]">

      {/* Header WC2026 */}
      <div className="wc-header text-white px-4 pt-5 pb-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start justify-between mb-3">
            <div>
              <Link href="/leagues" className="text-[10px] text-gray-500 hover:text-gray-300 uppercase tracking-widest">
                ← Mes ligues
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-[#00A650] font-bold uppercase tracking-widest">FIFA World Cup 2026™</p>
                {isAdmin && (
                  <span className="text-[10px] bg-[#E8A020] text-[#0D1B2E] font-bold px-2 py-0.5 rounded-full">ADMIN</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white mt-0.5">{(league as any).name}</h1>
            </div>
            <Image src="/wc2026.png" alt="WC2026" width={50} height={50} className="opacity-80 mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Code d&apos;invitation</span>
            <CopyCode code={(league as any).code} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* Classement */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-[#E8A020] rounded-full"></div>
            <h2 className="font-bold text-[#0D1B2E]">Classement</h2>
          </div>

          {!standings.length ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">
              Aucun point encore — pronostique les matchs !
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {standings.map((s, i) => (
                <div key={s.user_id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${s.user_id === user.id ? "bg-green-50/60" : ""}`}>
                  <span className={`w-7 text-center font-bold text-lg ${medalColors[i] ?? "text-gray-400"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-sm text-gray-400">{i + 1}</span>}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-[#0D1B2E] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {(s.username?.[0] ?? "?").toUpperCase()}
                  </div>
                  <span className="flex-1 font-semibold text-[#0D1B2E] text-sm">{s.username}</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#00A650] text-lg">{s.total_points}</span>
                    <span className="text-gray-400 text-xs ml-1">pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* En direct */}
        {liveMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="font-bold text-[#0D1B2E]">En direct</h2>
            </div>
            <div className="space-y-2">
              {liveMatches.map((match: any) => (
                <MatchCard key={match.id} match={match} leagueId={id} locked
                  href={`/leagues/${id}/match/${match.id}`} />
              ))}
            </div>
          </section>
        )}

        {/* À venir */}
        {upcomingMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#00A650] rounded-full"></div>
              <h2 className="font-bold text-[#0D1B2E]">Matchs à venir</h2>
              <span className="text-xs text-gray-400 font-medium ml-auto">{upcomingMatches.length} matchs</span>
            </div>
            <div className="space-y-2">
              {upcomingMatches.map((match: any) => (
                <MatchCard key={match.id} match={match} leagueId={id}
                  locked={false}
                  predicted={predictedMatchIds.has(match.id)}
                  href={`/leagues/${id}/match/${match.id}`} />
              ))}
            </div>
          </section>
        )}

        {/* En attente de score admin */}
        {pendingMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-orange-400 rounded-full"></div>
              <h2 className="font-bold text-[#0D1B2E]">En attente de score</h2>
              <span className="text-xs text-gray-400 font-medium ml-auto">{pendingMatches.length} matchs</span>
            </div>
            <div className="space-y-2">
              {pendingMatches.map((match: any) => (
                <MatchCard key={match.id} match={match} leagueId={id}
                  locked={true}
                  predicted={predictedMatchIds.has(match.id)}
                  href={`/leagues/${id}/match/${match.id}`} />
              ))}
            </div>
          </section>
        )}

        {/* Résultats */}
        {finishedMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-gray-400 rounded-full"></div>
              <h2 className="font-bold text-[#0D1B2E]">Résultats</h2>
              <span className="text-xs text-gray-400 font-medium ml-auto">{finishedMatches.length} matchs</span>
            </div>
            <div className="space-y-2">
              {finishedMatches.map((match: any) => (
                <MatchCard key={match.id} match={match} leagueId={id}
                  showScore
                  predicted={predictedMatchIds.has(match.id)}
                  href={`/leagues/${id}/match/${match.id}`} />
              ))}
            </div>
          </section>
        )}

        {/* Lien admin */}
        {isAdmin && (
          <div className="bg-[#0D1B2E]/5 border border-[#0D1B2E]/10 rounded-xl p-4 text-center">
            <Link href="/admin/matches"
              className="text-sm font-bold text-[#0D1B2E] hover:text-[#00A650] transition-colors">
              ⚙️ Saisir les scores (Admin) →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
