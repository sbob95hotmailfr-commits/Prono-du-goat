/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, isMatchLocked } from "@/lib/utils";
import { PredictionForm } from "@/components/prediction-form";
import { ConfettiClient } from "@/components/confetti-client";
import type { Prediction } from "@/types/database";

export default async function MatchPage({ params }: { params: { id: string; matchId: string } }) {
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

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", params.matchId)
    .single() as any;

  if (!match) notFound();

  const { data: predictionData } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", user.id)
    .eq("match_id", params.matchId)
    .eq("league_id", params.id)
    .single() as any;

  const prediction = predictionData as Prediction | null;
  const m = match as any;

  const locked = isMatchLocked(m.kickoff_at) || prediction?.is_locked;
  const finished = m.status === "finished";

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/leagues/${params.id}`} className="text-muted hover:text-dark">←</Link>
        <span className="text-sm text-muted">{m.stage}</span>
      </div>

      {/* Affichage du match */}
      <div className="card p-6 mb-4 text-center">
        <p className="text-xs text-muted mb-4">{formatDate(m.kickoff_at)}</p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 text-center">
            <div className="text-5xl mb-2">{m.home_flag}</div>
            <p className="font-semibold text-dark text-sm">{m.home_team}</p>
          </div>
          {finished && m.home_score != null ? (
            <div className="text-center px-4">
              <p className="font-mono text-4xl font-bold text-dark">{m.home_score} – {m.away_score}</p>
              <p className="text-xs text-muted mt-1">Score final</p>
            </div>
          ) : (
            <div className="text-muted font-bold text-xl px-4">VS</div>
          )}
          <div className="flex-1 text-center">
            <div className="text-5xl mb-2">{m.away_flag}</div>
            <p className="font-semibold text-dark text-sm">{m.away_team}</p>
          </div>
        </div>
      </div>

      {/* Zone pronostic */}
      {finished && prediction ? (
        <div className="card p-6 text-center">
          <h2 className="font-bold text-dark mb-4">Mon pronostic</h2>
          <p className="font-mono text-4xl font-bold text-primary mb-2">
            {prediction.home_score_pred} – {prediction.away_score_pred}
          </p>
          <div className="mt-4">
            {prediction.points_earned === 3 && (
              <>
                <div className="badge-exact text-base px-4 py-2 mx-auto inline-flex">⭐ Score exact — +3 points !</div>
                <ConfettiClient />
              </>
            )}
            {prediction.points_earned === 1 && <span className="text-primary font-semibold">✓ Bon résultat — +1 point</span>}
            {prediction.points_earned === 0 && <span className="text-muted">✗ Raté — 0 point</span>}
          </div>
        </div>
      ) : locked ? (
        <div className="card p-6 text-center">
          <div className="badge-locked text-sm px-4 py-2 mx-auto inline-flex mb-3">🔒 Pronostic verrouillé</div>
          {prediction ? (
            <div className="mt-3">
              <p className="text-muted text-sm mb-1">Ton pronostic :</p>
              <p className="font-mono text-3xl font-bold text-dark">
                {prediction.home_score_pred} – {prediction.away_score_pred}
              </p>
            </div>
          ) : (
            <p className="text-muted text-sm mt-2">Tu n&apos;as pas pronostiqué ce match.</p>
          )}
        </div>
      ) : (
        <PredictionForm matchId={params.matchId} leagueId={params.id} existingPrediction={prediction ?? null} />
      )}
    </div>
  );
}
