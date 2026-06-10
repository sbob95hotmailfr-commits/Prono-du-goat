/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { StandingsPodium } from "@/components/standings-podium";
import { CopyCode } from "@/components/copy-code";
import { formatDate, isMatchLocked } from "@/lib/utils";
import type { LeagueStanding } from "@/types/database";

export default async function LeaguePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("league_members")
    .select("*")
    .eq("league_id", params.id)
    .eq("user_id", user.id)
    .single() as any;

  if (!membership) notFound();

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", params.id)
    .single() as any;

  if (!league) notFound();

  const { data: standingsData } = await supabase
    .from("league_standings")
    .select("*")
    .eq("league_id", params.id)
    .order("total_points", { ascending: false }) as any;

  const standings = (standingsData ?? []) as LeagueStanding[];

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true })
    .limit(20) as any;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <Link href="/leagues" className="text-muted hover:text-dark text-sm">← Mes ligues</Link>
      </div>

      <div className="card p-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark">{(league as any).name}</h1>
          <p className="text-sm text-muted mt-0.5">
            Code d&apos;invitation : <CopyCode code={(league as any).code} />
          </p>
        </div>
        {(league as any).admin_id === user.id && <span className="badge-exact">⭐ Admin</span>}
      </div>

      {standings.length >= 2 && <StandingsPodium standings={standings} />}

      <section className="mb-8">
        <h2 className="font-bold text-dark mb-3">Classement</h2>
        {!standings.length ? (
          <div className="card p-6 text-center text-muted">Aucun point encore — les matchs n&apos;ont pas commencé !</div>
        ) : (
          <div className="card divide-y divide-border">
            {standings.map((s, i) => (
              <div key={s.user_id} className={`flex items-center gap-3 p-3 ${s.user_id === user.id ? "bg-green-50" : ""}`}>
                <span className={`w-6 text-center font-mono font-bold text-sm ${i === 0 ? "text-gold" : i === 1 ? "text-gray-500" : i === 2 ? "text-amber-600" : "text-muted"}`}>
                  {i + 1}
                </span>
                <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-sm font-bold text-dark shrink-0">
                  {s.avatar_url
                    ? <img src={s.avatar_url} alt={s.username} className="w-full h-full rounded-full object-cover" />
                    : s.username[0].toUpperCase()}
                </div>
                <span className="flex-1 font-medium text-dark text-sm">{s.username}</span>
                <span className="font-mono font-bold text-primary">{s.total_points} pts</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-dark mb-3">Matchs</h2>
        <div className="space-y-2">
          {(matches as any[])?.map((match: any) => {
            const locked = isMatchLocked(match.kickoff_at);
            const finished = match.status === "finished";
            return (
              <Link key={match.id} href={`/leagues/${params.id}/match/${match.id}`}
                className="card p-3 flex items-center justify-between hover:border-primary transition-colors block">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark truncate">
                    {match.home_flag} {match.home_team} <span className="text-muted">vs</span> {match.away_flag} {match.away_team}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{formatDate(match.kickoff_at)} · {match.stage}</p>
                </div>
                <div className="shrink-0 ml-3 text-right">
                  {finished && match.home_score != null ? (
                    <span className="font-mono font-bold text-sm">{match.home_score}-{match.away_score}</span>
                  ) : locked ? (
                    <span className="badge-locked text-xs">🔒</span>
                  ) : (
                    <span className="text-xs text-primary font-semibold">Pronostiquer →</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
