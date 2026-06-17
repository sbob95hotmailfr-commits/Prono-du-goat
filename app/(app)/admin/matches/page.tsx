import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { AdminScoreForm } from "@/components/admin-score-form";
import { AdminRecalculateBtn } from "@/components/admin-recalculate-btn";
import type { Match } from "@/types/database";

export default async function AdminMatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Vérifier que l'utilisateur est admin d'au moins une ligue
  const { data: adminLeagues } = await supabase
    .from("leagues")
    .select("id")
    .eq("admin_id", user.id);

  if (!adminLeagues?.length) redirect("/dashboard");

  const { data: matchesData } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  const matches = (matchesData ?? []) as Match[];
  const upcoming = matches.filter((m) => m.status !== "finished");
  const finished = matches.filter((m) => m.status === "finished");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark">Admin — Saisie des scores</h1>
        <a href="/dashboard" className="text-sm text-muted hover:text-dark">← Dashboard</a>
      </div>

      <p className="text-sm text-muted mb-4">
        Saisis le score final d&apos;un match. Les points seront calculés automatiquement.
      </p>

      <div className="mb-6">
        <AdminRecalculateBtn />
      </div>

      <section className="mb-8">
        <h2 className="font-bold text-dark mb-3">Matchs en attente ({upcoming.length})</h2>
        {!upcoming.length ? (
          <div className="card p-4 text-center text-muted text-sm">Tous les scores ont été saisis ✅</div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((match) => (
              <div key={match.id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-dark text-sm">
                      {match.home_flag} {match.home_team} vs {match.away_flag} {match.away_team}
                    </p>
                    <p className="text-xs text-muted">{formatDate(match.kickoff_at)} · {match.stage}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-bg text-muted border border-border">
                    {match.status}
                  </span>
                </div>
                <AdminScoreForm matchId={match.id} homeFlag={match.home_flag ?? ""} awayFlag={match.away_flag ?? ""} />
              </div>
            ))}
          </div>
        )}
      </section>

      {finished.length > 0 && (
        <section>
          <h2 className="font-bold text-dark mb-3">Matchs terminés ({finished.length})</h2>
          <div className="card divide-y divide-border">
            {finished.map((match) => (
              <div key={match.id} className="flex items-center justify-between p-3">
                <p className="text-sm text-dark">
                  {match.home_flag} {match.home_team} vs {match.away_flag} {match.away_team}
                </p>
                <span className="font-mono font-bold text-sm text-primary">
                  {match.home_score} – {match.away_score}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
