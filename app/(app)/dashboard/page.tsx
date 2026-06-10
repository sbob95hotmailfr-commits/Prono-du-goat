/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, isMatchLocked } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single() as any;

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name)")
    .eq("user_id", user.id) as any;

  const firstLeagueId = (memberships as any[])?.[0]?.league_id as string | undefined;

  const { data: standing } = firstLeagueId
    ? await (supabase
        .from("league_standings")
        .select("*")
        .eq("user_id", user.id)
        .eq("league_id", firstLeagueId)
        .single() as any)
    : { data: null };

  const { data: upcomingMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "upcoming")
    .order("kickoff_at", { ascending: true })
    .limit(3) as any;

  const { data: recentPredictions } = await supabase
    .from("predictions")
    .select("*, matches(home_team, away_team, home_flag, away_flag, home_score, away_score, kickoff_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3) as any;

  const { count: predCount } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id) as any;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">
            Bonjour {profile?.username} 👋
          </h1>
          <p className="text-muted text-sm">Coupe du Monde 2026</p>
        </div>
        <form action="/auth/signout" method="POST">
          <button type="submit" className="text-sm text-muted hover:text-danger transition-colors">
            Déconnexion
          </button>
        </form>
      </div>

      {/* Cards résumé */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="font-mono text-3xl font-bold text-primary">{(standing as any)?.total_points ?? 0}</p>
          <p className="text-xs text-muted mt-1">Points totaux</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-mono text-3xl font-bold text-dark">{predCount ?? 0}</p>
          <p className="text-xs text-muted mt-1">Pronos validés</p>
        </div>
      </div>

      {/* Pas encore dans une ligue */}
      {!(memberships as any[])?.length && (
        <div className="card p-6 text-center mb-6">
          <p className="text-2xl mb-2">⚽</p>
          <p className="font-semibold text-dark mb-1">Rejoins une ligue pour commencer !</p>
          <p className="text-sm text-muted mb-4">Crée ou rejoins une ligue privée avec tes amis.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/leagues/create" className="btn-primary text-sm px-4 py-2">Créer une ligue</Link>
            <Link href="/leagues/join" className="btn-secondary text-sm px-4 py-2">Rejoindre</Link>
          </div>
        </div>
      )}

      {/* Prochains matchs */}
      {(upcomingMatches as any[])?.length > 0 && (
        <section className="mb-6">
          <h2 className="font-bold text-dark mb-3">Prochains matchs</h2>
          <div className="space-y-2">
            {(upcomingMatches as any[]).map((match: any) => {
              const locked = isMatchLocked(match.kickoff_at);
              return (
                <div key={match.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-dark text-sm">
                      {match.home_flag} {match.home_team} <span className="text-muted">vs</span> {match.away_flag} {match.away_team}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{formatDate(match.kickoff_at)} · {match.stage}</p>
                  </div>
                  {firstLeagueId && !locked && (
                    <Link href={`/leagues/${firstLeagueId}/match/${match.id}`}
                      className="text-xs btn-primary px-3 py-1.5 shrink-0 ml-2">
                      Pronostiquer
                    </Link>
                  )}
                  {locked && <span className="badge-locked ml-2">🔒</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Derniers résultats */}
      {(recentPredictions as any[])?.length > 0 && (
        <section className="mb-6">
          <h2 className="font-bold text-dark mb-3">Derniers résultats</h2>
          <div className="space-y-2">
            {(recentPredictions as any[]).map((pred: any) => {
              const match = pred.matches;
              return (
                <div key={pred.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-dark text-sm">
                      {match?.home_flag} {match?.home_team} vs {match?.away_flag} {match?.away_team}
                    </p>
                    <p className="text-xs text-muted">
                      Mon prono : <span className="font-mono font-bold">{pred.home_score_pred}-{pred.away_score_pred}</span>
                      {match?.home_score != null && (
                        <> · Résultat : <span className="font-mono font-bold">{match.home_score}-{match.away_score}</span></>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {pred.points_earned === 3 && <span className="badge-exact">⭐ +3</span>}
                    {pred.points_earned === 1 && <span className="text-xs font-semibold text-primary">✓ +1</span>}
                    {pred.points_earned === 0 && <span className="text-xs text-muted">✗ 0</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(memberships as any[])?.length > 0 && (
        <Link href="/leagues" className="btn-secondary w-full text-center block">
          Voir mes ligues →
        </Link>
      )}
    </div>
  );
}
