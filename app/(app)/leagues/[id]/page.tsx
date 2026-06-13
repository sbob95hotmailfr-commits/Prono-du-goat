/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CopyCode } from "@/components/copy-code";
import { formatDate, isMatchLocked } from "@/lib/utils";
import { FlagImage } from "@/components/flag-image";
import type { LeagueStanding } from "@/types/database";

export default async function LeaguePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("league_members").select("*")
    .eq("league_id", params.id).eq("user_id", user.id).single() as any;
  if (!membership) notFound();

  const { data: league } = await supabase
    .from("leagues").select("*").eq("id", params.id).single() as any;
  if (!league) notFound();

  const { data: standingsData } = await supabase
    .from("league_standings").select("*").eq("league_id", params.id)
    .order("total_points", { ascending: false }) as any;

  const standings = (standingsData ?? []) as LeagueStanding[];

  const { data: matches } = await supabase
    .from("matches").select("*")
    .order("kickoff_at", { ascending: true }) as any;

  const allMatches = (matches as any[]) ?? [];
  const finishedMatches = allMatches.filter((m: any) => m.status === "finished");
  const upcomingMatches = allMatches.filter((m: any) => m.status !== "finished");

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
                    {s.username[0].toUpperCase()}
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

        {/* Matchs à venir */}
        <section className="mb-6">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-green-500 rounded-full inline-block"></span>
            Matchs à venir
          </h2>
          <div className="space-y-2">
            {upcomingMatches.map((match: any) => {
              const locked = isMatchLocked(match.kickoff_at);
              return (
                <Link key={match.id} href={`/leagues/${params.id}/match/${match.id}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:shadow-md hover:border-green-200 transition-all block">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FlagImage team={match.home_team} size="md" />
                    <span className="font-semibold text-gray-800 text-sm truncate">{match.home_team}</span>
                    <span className="text-xs text-gray-400 font-bold shrink-0 px-1">vs</span>
                    <span className="font-semibold text-gray-800 text-sm truncate">{match.away_team}</span>
                    <FlagImage team={match.away_team} size="md" />
                  </div>
                  <div className="shrink-0 ml-2 text-right">
                    <p className="text-xs text-gray-500">{formatDate(match.kickoff_at)}</p>
                    {locked ? (
                      <span className="text-sm">🔒</span>
                    ) : (
                      <span className="text-xs text-green-600 font-bold">Pronostiquer →</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Résultats */}
        {finishedMatches.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-gray-400 rounded-full inline-block"></span>
              Résultats
            </h2>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {finishedMatches.map((match: any) => (
                <Link key={match.id} href={`/leagues/${params.id}/match/${match.id}`}
                  className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 flex-1">
                    <FlagImage team={match.home_team} size="sm" />
                    <span className="text-sm text-gray-700">{match.home_team}</span>
                    <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded mx-1">
                      {match.home_score} – {match.away_score}
                    </span>
                    <span className="text-sm text-gray-700">{match.away_team}</span>
                    <FlagImage team={match.away_team} size="sm" />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{match.stage}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
