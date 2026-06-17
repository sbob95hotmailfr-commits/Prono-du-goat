/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
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

  // Charger les pronostics de l'utilisateur pour cette ligue
  const { data: userPredictions } = await supabase
    .from("predictions").select("match_id")
    .eq("user_id", user.id).eq("league_id", id) as any;

  const predictedMatchIds = new Set((userPredictions ?? []).map((p: any) => p.match_id));

  const now = new Date();
  const allMatches = (matches as any[]) ?? [];
  const finishedMatches = allMatches.filter((m: any) => m.status === "finished");
  const liveMatches = allMatches.filter((m: any) => m.status === "live");
  // Matchs à venir : status upcoming ET kickoff dans le futur
  const upcomingMatches = allMatches.filter(
    (m: any) => m.status === "upcoming" && new Date(m.kickoff_at) > now
  );
  // Matchs passés non encore scorés : kickoff dépassé mais pas encore "finished"
  const pendingMatches = allMatches.filter(
    (m: any) => m.status === "upcoming" && new Date(m.kickoff_at) <= now
  );

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/leagues" className="text-xs text-gray-400 hover:text-white">← Mes ligues</Link>
            <h1 className="text-xl font-bold mt-1">{(league as any).name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {(league as any).admin_id === user.id && (
              <span className="text-xs bg-yellow-500 text-yellow-900 font-bold px-2 py-1 rounded-full">⭐ Admin</span>
            )}
          </div>
        </div>
        <div className="max-w-2xl mx-auto mt-2">
          <p className="text-xs text-gray-400">
            Code d&apos;invitation : <CopyCode code={(league as any).code} />
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* Classement */}
        <section className="mb-6">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-yellow-500 rounded-full inline-block"></span>
            Classement
          </h2>
          {!standings.length ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
              Aucun point encore — pronostique les matchs !
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {standings.map((s, i) => (
                <div key={s.user_id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${s.user_id === user.id ? "bg-green-50" : ""}`}>
                  <span className={`w-7 text-center font-bold text-lg ${medalColors[i] ?? "text-gray-400"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">
                    {(s.username?.[0] ?? "?").toUpperCase()}
                  </div>
                  <span className="flex-1 font-semibold text-gray-800">{s.username}</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-green-600 text-lg">{s.total_points}</span>
                    <span className="text-gray-400 text-sm ml-1">pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Matchs en cours */}
        {liveMatches.length > 0 && (
          <section className="mb-6">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-500 rounded-full inline-block animate-pulse"></span>
              En direct
            </h2>
            <div className="space-y-2">
              {liveMatches.map((match: any) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  leagueId={id}
                  locked
                  href={`/leagues/${id}/match/${match.id}`}
                />
              ))}
            </div>
          </section>
        )}

        {/* Matchs à venir */}
        {upcomingMatches.length > 0 && (
          <section className="mb-6">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-green-500 rounded-full inline-block"></span>
              Matchs à venir
            </h2>
            <div className="space-y-2">
              {upcomingMatches.map((match: any) => {
                const predicted = predictedMatchIds.has(match.id);
                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    leagueId={id}
                    locked={false}
                    predicted={predicted}
                    href={`/leagues/${id}/match/${match.id}`}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Matchs joués en attente de score */}
        {pendingMatches.length > 0 && (
          <section className="mb-6">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-orange-400 rounded-full inline-block"></span>
              En attente de score
            </h2>
            <div className="space-y-2">
              {pendingMatches.map((match: any) => {
                const predicted = predictedMatchIds.has(match.id);
                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    leagueId={id}
                    locked={true}
                    predicted={predicted}
                    href={`/leagues/${id}/match/${match.id}`}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Résultats */}
        {finishedMatches.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-gray-400 rounded-full inline-block"></span>
              Résultats
            </h2>
            <div className="space-y-2">
              {finishedMatches.map((match: any) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  leagueId={id}
                  showScore
                  href={`/leagues/${id}/match/${match.id}`}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
