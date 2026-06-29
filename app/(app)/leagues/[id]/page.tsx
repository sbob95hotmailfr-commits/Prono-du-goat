/* eslint-disable @typescript-eslint/no-explicit-any */
export const revalidate = 60; // revalide les données toutes les 60s

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { WcNav } from "@/components/wc-nav";
import { MatchCard } from "@/components/match-card";
import { HeroNextMatch } from "@/components/hero-next-match";
import { isMatchLocked } from "@/lib/utils";
import type { LeagueStanding } from "@/types/database";

function formatDayHeader(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
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

  // Matchs à venir (non terminés, non live)
  const upcomingMatches = allMatches.filter((m: any) =>
    m.status === "upcoming" && !isMatchLocked(m.kickoff_at)
  );

  // Hero : prochain match non pronostiqué, sinon prochain match tout court
  const heroMatch =
    upcomingMatches.find((m: any) => !predictedMatchIds.has(m.id)) ??
    upcomingMatches[0] ??
    null;

  // Nombre de matchs à pronostiquer (non clôturés + non prédits)
  const pendingCount = upcomingMatches.filter((m: any) => !predictedMatchIds.has(m.id)).length;

  // Live
  const liveMatches = allMatches.filter((m: any) => m.status === "live");

  // Séparer matchs à venir et terminés (hors live)
  const nonLive = allMatches.filter((m: any) => m.status !== "live");
  const upcomingNonLive = nonLive.filter((m: any) => m.status !== "finished");
  const finishedNonLive = nonLive.filter((m: any) => m.status === "finished");

  const todayKey = getLocalDay(now.toISOString());

  // Grouper matchs à venir par jour
  const upcomingByDay: Record<string, any[]> = {};
  for (const m of upcomingNonLive) {
    const day = getLocalDay(m.kickoff_at);
    if (!upcomingByDay[day]) upcomingByDay[day] = [];
    upcomingByDay[day].push(m);
  }
  const upcomingDays = Object.keys(upcomingByDay).sort((a, b) =>
    new Date(a.split("/").reverse().join("-")).getTime() -
    new Date(b.split("/").reverse().join("-")).getTime()
  );

  // Grouper matchs terminés par jour (plus récent en premier)
  const finishedByDay: Record<string, any[]> = {};
  for (const m of finishedNonLive) {
    const day = getLocalDay(m.kickoff_at);
    if (!finishedByDay[day]) finishedByDay[day] = [];
    finishedByDay[day].push(m);
  }
  const finishedDays = Object.keys(finishedByDay).sort((a, b) =>
    new Date(b.split("/").reverse().join("-")).getTime() -
    new Date(a.split("/").reverse().join("-")).getTime()
  );

  // Stats rapides pour l'utilisateur
  const myStanding = standings.find((s: any) => s.user_id === user.id);
  const myRank = myStanding ? standings.findIndex((s: any) => s.user_id === user.id) + 1 : null;
  const totalPredicted = allMatches.filter((m: any) => predictedMatchIds.has(m.id) && m.status === "finished").length;
  const finishedMatches = allMatches.filter((m: any) => m.status === "finished").length;

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  return (
    <div className="min-h-screen" style={{ background: "#0D1525" }}>
      <WcNav
        leagueId={id}
        leagueName={(league as any).name}
        code={(league as any).code}
        isAdmin={isAdmin}
        activeTab="matches"
        pendingCount={pendingCount}
      />

      {/* Hero : prochain match */}
      {heroMatch ? (
        <HeroNextMatch
          match={heroMatch}
          leagueId={id}
          predicted={predictedMatchIds.has(heroMatch.id)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center"
          style={{ background: "linear-gradient(135deg,#050D1A,#0D1B2E)" }}>
          <span className="text-4xl mb-3">🏆</span>
          <p className="text-white font-bold text-lg">Tournoi terminé !</p>
          <p className="text-gray-400 text-sm mt-1">Tous les matchs sont joués</p>
        </div>
      )}

      {/* Bande de stats rapides */}
      <div className="border-y border-white/5" style={{ background: "#111927" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center gap-6 md:gap-10 flex-wrap">
          {myRank && (
            <div className="flex items-center gap-2 text-center">
              <span className="text-2xl">{myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🏅"}</span>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Classement</p>
                <p className="text-white font-black text-lg leading-none">#{myRank}</p>
              </div>
            </div>
          )}
          {myStanding && (
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Points</p>
              <p className="font-black text-xl leading-none" style={{ color: "#F5A623" }}>{(myStanding as any).total_points ?? 0}</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pronos</p>
            <p className="text-white font-black text-xl leading-none">{totalPredicted}/{finishedMatches}</p>
          </div>
          {pendingCount > 0 && (
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">À pronostiquer</p>
              <p className="font-black text-xl leading-none" style={{ color: "#E8192C" }}>{pendingCount}</p>
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">

        {/* Colonne matchs */}
        <div className="flex-1">

          {/* Live */}
          {liveMatches.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 px-4 py-2 rounded-t-xl"
                style={{ background: "#E8192C" }}>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-black uppercase tracking-widest">En direct</span>
              </div>
              <div className="rounded-b-xl overflow-hidden" style={{ background: "#1A2535" }}>
                {liveMatches.map((m: any) => (
                  <MatchCard key={m.id} match={m} leagueId={id} locked
                    href={`/leagues/${id}/match/${m.id}`} />
                ))}
              </div>
            </div>
          )}

          {/* Matchs à venir par date */}
          {upcomingDays.map((day) => {
            const dayMatches = upcomingByDay[day];
            const isToday = day === todayKey;

            return (
              <div key={day} className="mb-4">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-t-xl"
                  style={{ background: isToday ? "#003DA5" : "#192233" }}>
                  <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? "text-white" : "text-gray-300"}`}>
                    {formatDayHeader(dayMatches[0].kickoff_at)}
                  </span>
                  {isToday && (
                    <span className="text-[9px] bg-white text-[#003DA5] font-black px-2 py-0.5 rounded uppercase">
                      Aujourd&apos;hui
                    </span>
                  )}
                </div>

                <div className="rounded-b-xl overflow-hidden" style={{ background: "#1A2535" }}>
                  {dayMatches.map((m: any, idx: number) => {
                    const locked = isMatchLocked(m.kickoff_at);
                    const predicted = predictedMatchIds.has(m.id);
                    return (
                      <div key={m.id} className={idx > 0 ? "border-t border-white/5" : ""}>
                        <MatchCard
                          match={m}
                          leagueId={id}
                          locked={locked}
                          predicted={predicted}
                          href={`/leagues/${id}/match/${m.id}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Matchs terminés — section pliable */}
          {finishedDays.length > 0 && (
            <details className="mt-8">
              <summary className="cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
                style={{ background: "#111927" }}>
                <span className="text-white font-bold text-sm">Matchs terminés</span>
                <span className="text-gray-500 text-xs">({finishedNonLive.length} matchs)</span>
                <span className="text-gray-500 text-xs ml-auto">Cliquer pour afficher ▾</span>
              </summary>

              {finishedDays.map((day) => {
                const dayMatches = finishedByDay[day];

                return (
                  <div key={day} className="mb-4">
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-t-xl"
                      style={{ background: "#1A2535" }}>
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        {formatDayHeader(dayMatches[0].kickoff_at)}
                      </span>
                    </div>

                    <div className="rounded-b-xl overflow-hidden" style={{ background: "#1A2535" }}>
                      {dayMatches.map((m: any, idx: number) => {
                        const predicted = predictedMatchIds.has(m.id);
                        return (
                          <div key={m.id} className={idx > 0 ? "border-t border-white/5" : ""}>
                            <MatchCard
                              match={m}
                              leagueId={id}
                              locked
                              showScore
                              predicted={predicted}
                              href={`/leagues/${id}/match/${m.id}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </details>
          )}
        </div>

        {/* Classement ligue */}
        <div className="lg:w-72 shrink-0">
          <div className="rounded-xl overflow-hidden sticky top-24" style={{ background: "#1A2535" }}>
            <div className="px-4 py-3" style={{ background: "#111927" }}>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest">FIFA World Cup 2026™</p>
              <p className="font-bold text-white text-sm">Classement ligue</p>
            </div>

            {!standings.length ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Aucun point encore
              </div>
            ) : (
              <div>
                {standings.map((s, i) => (
                  <div key={(s as any).user_id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 ${(s as any).user_id === user.id ? "bg-[#003DA5]/10" : ""}`}>
                    <span className={`w-5 text-center text-sm font-bold ${medalColors[i] ?? "text-gray-600"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-gray-500 text-xs">{i + 1}</span>}
                    </span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ background: (s as any).user_id === user.id ? "#003DA5" : "#2A3548" }}>
                      {((s as any).username?.[0] ?? "?").toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-gray-200 truncate">{(s as any).username}</span>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-lg" style={{ color: "#F5A623" }}>{(s as any).total_points}</span>
                      <span className="text-gray-600 text-xs ml-0.5">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 text-center border-t border-white/5">
              <a href={`/leagues/${id}/groups`}
                className="text-xs font-semibold hover:underline"
                style={{ color: "#F5A623" }}>
                Classements des groupes →
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
