/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { WcNav } from "@/components/wc-nav";
import { MatchCard } from "@/components/match-card";
import { MatchCarousel } from "@/components/match-carousel";
import { isMatchLocked } from "@/lib/utils";
import type { LeagueStanding } from "@/types/database";

function formatDayHeader(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(dateStr));
}

function getLocalDay(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(dateStr));
}

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

  const { data: matchesRaw } = await supabase
    .from("matches").select("*")
    .order("kickoff_at", { ascending: true }) as any;

  const { data: userPredictions } = await supabase
    .from("predictions").select("match_id")
    .eq("user_id", user.id).eq("league_id", id) as any;

  const predictedMatchIds = new Set((userPredictions ?? []).map((p: any) => p.match_id));
  const isAdmin = (league as any).admin_id === user.id;
  const now = new Date();
  const allMatches = (matchesRaw ?? []) as any[];

  // Séparer live
  const liveMatches = allMatches.filter((m: any) => m.status === "live");

  // Carousel : live en premier, puis les 10 derniers matchs terminés + 5 prochains
  const recentFinished = allMatches
    .filter((m: any) => m.status === "finished")
    .slice(-8);
  const nextUpcoming = allMatches
    .filter((m: any) => m.status === "upcoming")
    .slice(0, 5);
  const carouselMatches = [...liveMatches, ...recentFinished, ...nextUpcoming]
    .filter((m: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === m.id) === i)
    .sort((a: any, b: any) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime())
    .slice(0, 12);

  // Grouper tous les autres par date locale (Paris)
  const nonLive = allMatches.filter((m: any) => m.status !== "live");
  const byDay: Record<string, any[]> = {};
  for (const m of nonLive) {
    const day = getLocalDay(m.kickoff_at);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(m);
  }
  const sortedDays = Object.keys(byDay).sort((a, b) =>
    new Date(a.split("/").reverse().join("-")).getTime() -
    new Date(b.split("/").reverse().join("-")).getTime()
  );

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  // Trouver la date d'aujourd'hui
  const todayKey = getLocalDay(now.toISOString());

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <WcNav
        leagueId={id}
        leagueName={(league as any).name}
        code={(league as any).code}
        isAdmin={isAdmin}
        activeTab="matches"
      />

      {/* Carousel matchs récents / en direct */}
      <MatchCarousel matches={carouselMatches} leagueId={id} />

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">

        {/* Colonne principale : matchs */}
        <div className="flex-1">

          {/* Live */}
          {liveMatches.length > 0 && (
            <div className="mb-4">
              <div className="bg-[#E8192C] text-white text-xs font-bold uppercase tracking-widest px-4 py-2">
                <span className="animate-pulse mr-2">●</span> En direct
              </div>
              <div className="bg-white shadow-sm rounded-b-xl overflow-hidden">
                {liveMatches.map((m: any) => (
                  <MatchCard key={m.id} match={m} leagueId={id} locked
                    href={`/leagues/${id}/match/${m.id}`} />
                ))}
              </div>
            </div>
          )}

          {/* Matchs par date */}
          {sortedDays.map((day) => {
            const dayMatches = byDay[day];
            const isToday = day === todayKey;
            const isPast = new Date(day.split("/").reverse().join("-")) < new Date(todayKey.split("/").reverse().join("-"));

            return (
              <div key={day} className="mb-4">
                {/* Séparateur de date FIFA */}
                <div className={`flex items-center gap-3 px-4 py-2 ${isToday ? "bg-[#003DA5]" : "bg-gray-800"}`}>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-white" : "text-gray-300"}`}>
                    {formatDayHeader(dayMatches[0].kickoff_at)}
                  </span>
                  {isToday && <span className="text-[10px] bg-white text-[#003DA5] font-bold px-2 py-0.5 rounded uppercase">Aujourd&apos;hui</span>}
                </div>

                <div className="bg-white shadow-sm overflow-hidden rounded-b-xl">
                  {dayMatches.map((m: any) => {
                    const locked = isMatchLocked(m.kickoff_at) || m.status === "finished";
                    const predicted = predictedMatchIds.has(m.id);
                    return (
                      <MatchCard
                        key={m.id}
                        match={m}
                        leagueId={id}
                        locked={locked}
                        showScore={m.status === "finished"}
                        predicted={predicted}
                        href={`/leagues/${id}/match/${m.id}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Colonne droite : classement ligue */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white shadow-sm rounded-xl overflow-hidden sticky top-24">
            <div className="bg-black px-4 py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">FIFA World Cup 2026™</p>
              <p className="font-bold text-white text-sm">Classement ligue</p>
            </div>

            {!standings.length ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Aucun point encore
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {standings.map((s, i) => (
                  <div key={s.user_id}
                    className={`flex items-center gap-3 px-4 py-3 ${s.user_id === user.id ? "bg-blue-50" : ""}`}>
                    <span className={`w-5 text-center text-sm font-bold ${medalColors[i] ?? "text-gray-400"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {(s.username?.[0] ?? "?").toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{s.username}</span>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-[#003DA5] text-base">{s.total_points}</span>
                      <span className="text-gray-400 text-xs ml-0.5">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 p-3 text-center">
              <a href={`/leagues/${id}/groups`}
                className="text-xs text-[#003DA5] font-semibold hover:underline">
                Voir les classements des groupes →
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
