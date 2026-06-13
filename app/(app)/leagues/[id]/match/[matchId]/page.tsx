/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, isMatchLocked } from "@/lib/utils";
import { PredictionForm } from "@/components/prediction-form";
import { ConfettiClient } from "@/components/confetti-client";
import { FlagImage } from "@/components/flag-image";
import type { Prediction } from "@/types/database";

export default async function MatchPage({ params }: { params: { id: string; matchId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("league_members").select("*")
    .eq("league_id", params.id).eq("user_id", user.id).single() as any;
  if (!membership) notFound();

  const { data: match } = await supabase
    .from("matches").select("*").eq("id", params.matchId).single() as any;
  if (!match) notFound();

  const { data: predictionData } = await supabase
    .from("predictions").select("*")
    .eq("user_id", user.id).eq("match_id", params.matchId)
    .eq("league_id", params.id).single() as any;

  const prediction = predictionData as Prediction | null;
  const m = match as any;
  const locked = isMatchLocked(m.kickoff_at) || prediction?.is_locked;
  const finished = m.status === "finished";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-5">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href={`/leagues/${params.id}`} className="text-gray-400 hover:text-white text-xl">←</Link>
          <span className="text-sm text-gray-300">{m.stage}</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5">
        {/* Affiche du match */}
        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <p className="text-xs text-gray-500 text-center mb-5 uppercase tracking-wide">{formatDate(m.kickoff_at)}</p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 text-center">
              <div className="flex justify-center mb-3">
                <FlagImage team={m.home_team} size="lg" className="rounded-lg shadow-md w-16 h-12" />
              </div>
              <p className="font-bold text-gray-800">{m.home_team}</p>
            </div>

            {finished && m.home_score != null ? (
              <div className="text-center px-4">
                <p className="font-mono text-4xl font-bold text-gray-800">{m.home_score} – {m.away_score}</p>
                <p className="text-xs text-gray-400 mt-1">Score final</p>
              </div>
            ) : (
              <div className="text-center px-4">
                <span className="text-gray-300 font-bold text-2xl">VS</span>
              </div>
            )}

            <div className="flex-1 text-center">
              <div className="flex justify-center mb-3">
                <FlagImage team={m.away_team} size="lg" className="rounded-lg shadow-md w-16 h-12" />
              </div>
              <p className="font-bold text-gray-800">{m.away_team}</p>
            </div>
          </div>
        </div>

        {/* Zone pronostic */}
        {finished && prediction ? (
          // Match terminé avec pronostic → afficher résultat + points
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <h2 className="font-bold text-gray-800 mb-4">Mon pronostic</h2>
            <p className="font-mono text-5xl font-bold text-green-600 mb-4">
              {prediction.home_score_pred} – {prediction.away_score_pred}
            </p>
            {prediction.points_earned === 3 && (
              <>
                <div className="bg-yellow-100 text-yellow-700 font-bold px-4 py-2 rounded-full inline-flex items-center gap-2">
                  ⭐ Score exact — +3 points !
                </div>
                <ConfettiClient />
              </>
            )}
            {prediction.points_earned === 1 && (
              <div className="bg-green-100 text-green-700 font-bold px-4 py-2 rounded-full inline-flex">✓ Bon résultat — +1 point</div>
            )}
            {prediction.points_earned === 0 && (
              <div className="bg-gray-100 text-gray-500 font-bold px-4 py-2 rounded-full inline-flex">✗ Raté — 0 point</div>
            )}
          </div>
        ) : finished && !prediction ? (
          // Match terminé sans pronostic
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-gray-400 text-sm">Tu n&apos;as pas pronostiqué ce match.</p>
          </div>
        ) : locked && prediction ? (
          // Match verrouillé avec pronostic → afficher le pronostic
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="text-3xl mb-2">🔒</div>
            <p className="font-bold text-gray-700 mb-1">Pronostic verrouillé</p>
            <p className="text-gray-500 text-sm mb-3">Ton pronostic :</p>
            <p className="font-mono text-4xl font-bold text-green-600">
              {prediction.home_score_pred} – {prediction.away_score_pred}
            </p>
          </div>
        ) : locked && !prediction ? (
          // Match verrouillé sans pronostic
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="font-bold text-gray-700 mb-1">Pronostic verrouillé</p>
            <p className="text-gray-400 text-sm mt-2">Tu n&apos;as pas pronostiqué ce match.</p>
          </div>
        ) : prediction ? (
          // Match pas encore verrouillé, pronostic existant → permettre modification
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 text-center">
              <p className="text-sm text-blue-600 font-semibold mb-1">✓ Pronostic enregistré</p>
              <p className="font-mono text-3xl font-bold text-blue-700">
                {prediction.home_score_pred} – {prediction.away_score_pred}
              </p>
              <p className="text-xs text-blue-400 mt-1">Tu peux le modifier jusqu&apos;au début du match</p>
            </div>
            <PredictionForm matchId={params.matchId} leagueId={params.id} existingPrediction={prediction} />
          </div>
        ) : (
          // Pas encore de pronostic
          <PredictionForm matchId={params.matchId} leagueId={params.id} existingPrediction={null} />
        )}
      </div>
    </div>
  );
}
