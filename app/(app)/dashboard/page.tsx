/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isMatchLocked } from "@/lib/utils";
import { FlagImage } from "@/components/flag-image";
import { MatchCard } from "@/components/match-card";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single() as any;

  const { data: memberships } = await supabase
    .from("league_members").select("league_id, leagues(id, name)")
    .eq("user_id", user.id) as any;

  const firstLeagueId = (memberships as any[])?.[0]?.league_id as string | undefined;

  const { data: standing } = firstLeagueId
    ? await (supabase.from("league_standings").select("*")
        .eq("user_id", user.id).eq("league_id", firstLeagueId).single() as any)
    : { data: null };

  const { data: upcomingMatches } = await supabase
    .from("matches").select("*").eq("status", "upcoming")
    .order("kickoff_at", { ascending: true }).limit(5) as any;

  const { data: recentPredictions } = await supabase
    .from("predictions")
    .select("*, matches(home_team, away_team, home_score, away_score, kickoff_at)")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(3) as any;

  const { count: predCount } = await supabase
    .from("predictions").select("*", { count: "exact", head: true })
    .eq("user_id", user.id) as any;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header sombre */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-0.5">Coupe du Monde 2026</p>
            <h1 className="text-xl font-bold">Bonjour {profile?.username} 👋</h1>
          </div>
          <form action="/auth/signout" method="POST">
            <button type="submit" className="text-xs text-gray-400 hover:text-white border border-gray-600 rounded-lg px-3 py-1.5 transition-colors">
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6 -mt-4">
          <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-green-500">
            <p className="font-mono text-4xl font-bold text-green-600">{(standing as any)?.total_points ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Points totaux</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center border-t-4 border-blue-500">
            <p className="font-mono text-4xl font-bold text-blue-600">{predCount ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Pronos validés</p>
          </div>
        </div>

        {/* Pas encore dans une ligue */}
        {!(memberships as any[])?.length && (
          <div className="bg-white rounded-xl shadow p-6 text-center mb-6">
            <p className="text-3xl mb-2">⚽</p>
            <p className="font-bold text-gray-800 mb-1">Rejoins une ligue pour commencer !</p>
            <p className="text-sm text-gray-500 mb-4">Crée ou rejoins une ligue privée avec tes amis.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/leagues/create" className="btn-primary text-sm px-4 py-2">Créer une ligue</Link>
              <Link href="/leagues/join" className="btn-secondary text-sm px-4 py-2">Rejoindre</Link>
            </div>
          </div>
        )}

        {/* Prochains matchs */}
        {(upcomingMatches as any[])?.length > 0 && (
          <section className="mb-6">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-green-500 rounded-full inline-block"></span>
              Prochains matchs
            </h2>
            <div className="space-y-2">
              {(upcomingMatches as any[]).map((match: any) => {
                const locked = isMatchLocked(match.kickoff_at);
                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    leagueId={firstLeagueId}
                    locked={locked}
                    href={firstLeagueId ? `/leagues/${firstLeagueId}/match/${match.id}` : undefined}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Derniers résultats */}
        {(recentPredictions as any[])?.length > 0 && (
          <section className="mb-6">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-blue-500 rounded-full inline-block"></span>
              Mes derniers pronos
            </h2>
            <div className="space-y-2">
              {(recentPredictions as any[]).map((pred: any) => {
                const match = pred.matches;
                return (
                  <div key={pred.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FlagImage team={match?.home_team} size="sm" />
                      <span className="text-sm text-gray-700">{match?.home_team}</span>
                      <span className="font-mono font-bold text-sm bg-gray-100 px-2 py-0.5 rounded">
                        {pred.home_score_pred}-{pred.away_score_pred}
                      </span>
                      <span className="text-sm text-gray-700">{match?.away_team}</span>
                      <FlagImage team={match?.away_team} size="sm" />
                    </div>
                    <div className="ml-2 shrink-0">
                      {pred.points_earned === 3 && <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">⭐ +3</span>}
                      {pred.points_earned === 1 && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">✓ +1</span>}
                      {pred.points_earned === 0 && match?.home_score != null && <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-full">✗ 0</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Voir mes ligues */}
        {(memberships as any[])?.length > 0 && (
          <Link href="/leagues"
            className="flex items-center justify-center gap-2 w-full bg-white border-2 border-green-500 text-green-600 font-bold py-3 rounded-xl hover:bg-green-50 transition-colors">
            Voir mes ligues →
          </Link>
        )}
      </div>
    </div>
  );
}
