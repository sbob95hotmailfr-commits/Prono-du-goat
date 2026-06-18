/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, isMatchLocked } from "@/lib/utils";
import { WcNav } from "@/components/wc-nav";
import { PredictionForm } from "@/components/prediction-form";
import { ScorerForm } from "@/components/scorer-form";
import { ConfettiClient } from "@/components/confetti-client";
import { FlagImage } from "@/components/flag-image";
import type { Prediction } from "@/types/database";

export default async function MatchPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("league_members").select("*")
    .eq("league_id", id).eq("user_id", user.id).single() as any;
  if (!membership) notFound();

  const { data: match } = await supabase
    .from("matches").select("*").eq("id", matchId).single() as any;
  if (!match) notFound();

  const { data: predictionData } = await supabase
    .from("predictions").select("*")
    .eq("user_id", user.id).eq("match_id", matchId)
    .eq("league_id", id).single() as any;

  const prediction = predictionData as Prediction | null;
  const m = match as any;
  const locked = isMatchLocked(m.kickoff_at) || prediction?.is_locked;
  const finished = m.status === "finished";
  const isAdmin = (await supabase.from("leagues").select("admin_id").eq("id", id).single() as any)?.data?.admin_id === user.id;

  // Charger les joueurs des deux équipes pour le pronostic buteur
  const adminSupabaseGlobal = createAdminClient();
  const { data: playersRaw } = await adminSupabaseGlobal
    .from("players")
    .select("id, name, team_name, position, photo_url")
    .in("team_name", [m.home_team, m.away_team])
    .order("team_name").order("name") as any;
  const players = (playersRaw ?? []) as any[];

  // Charger le pronostic buteur existant de l'utilisateur (si prediction existe)
  let currentScorerPrediction: any = null;
  if (prediction?.id) {
    const { data: sp } = await adminSupabaseGlobal
      .from("scorer_predictions")
      .select("player_id")
      .eq("prediction_id", prediction.id)
      .single() as any;
    currentScorerPrediction = sp;
  }

  // Charger les pronostics de tous les membres une fois le match verrouillé
  let allPredictions: any[] = [];
  if (locked || finished) {
    const adminSupabase = createAdminClient();
    const { data: preds } = await adminSupabase
      .from("predictions")
      .select("home_score_pred, away_score_pred, points_earned, user_id")
      .eq("match_id", matchId)
      .eq("league_id", id) as any;

    if (preds?.length) {
      const userIds = preds.map((p: any) => p.user_id);
      const { data: profiles } = await adminSupabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds) as any;

      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.username]));
      allPredictions = preds.map((p: any) => ({
        ...p,
        username: profileMap[p.user_id] ?? "Inconnu",
      }));

      // Trier : points desc, puis alphabétique
      allPredictions.sort((a: any, b: any) => {
        if (finished) return (b.points_earned ?? -1) - (a.points_earned ?? -1);
        return a.username.localeCompare(b.username);
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <WcNav leagueId={id} leagueName={m.stage} isAdmin={isAdmin} activeTab="matches" />

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">

        {/* Affiche du match */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="bg-[#0D1B2E] px-4 py-2 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest">{formatDate(m.kickoff_at)}</p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 text-center">
                <div className="flex justify-center mb-3">
                  <FlagImage team={m.home_team} size="lg" className="rounded-xl shadow-md w-16 h-12 object-cover border border-gray-100" />
                </div>
                <p className="font-bold text-[#0D1B2E] text-sm">{m.home_team}</p>
              </div>

              {finished && m.home_score != null ? (
                <div className="text-center px-2">
                  <div className="bg-[#0D1B2E] rounded-xl px-5 py-3">
                    <p className="font-mono text-3xl font-bold text-white tracking-widest">
                      {m.home_score} – {m.away_score}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">Score final</p>
                </div>
              ) : (
                <div className="text-center px-4">
                  <div className="border-2 border-dashed border-gray-200 rounded-xl px-4 py-2">
                    <span className="text-gray-300 font-bold text-xl">VS</span>
                  </div>
                </div>
              )}

              <div className="flex-1 text-center">
                <div className="flex justify-center mb-3">
                  <FlagImage team={m.away_team} size="lg" className="rounded-xl shadow-md w-16 h-12 object-cover border border-gray-100" />
                </div>
                <p className="font-bold text-[#0D1B2E] text-sm">{m.away_team}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Zone pronostic perso */}
        {finished && prediction ? (
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Mon pronostic</p>
            <p className="font-mono text-5xl font-bold text-[#0D1B2E] mb-4">
              {prediction.home_score_pred} – {prediction.away_score_pred}
            </p>
            {prediction.points_earned === 3 && (
              <>
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 font-bold px-4 py-2 rounded-full inline-flex items-center gap-2 text-sm">
                  ⭐ Score exact — +3 points !
                </div>
                <ConfettiClient />
              </>
            )}
            {prediction.points_earned === 1 && (
              <div className="bg-green-50 border border-green-200 text-[#00A650] font-bold px-4 py-2 rounded-full inline-flex text-sm">
                ✓ Bon résultat — +1 point
              </div>
            )}
            {prediction.points_earned === 0 && (
              <div className="bg-gray-50 border border-gray-200 text-gray-500 font-bold px-4 py-2 rounded-full inline-flex text-sm">
                ✗ Raté — 0 point
              </div>
            )}
          </div>
        ) : finished && !prediction ? (
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-gray-400 text-sm">Tu n&apos;as pas pronostiqué ce match.</p>
          </div>
        ) : locked && prediction ? (
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="text-3xl mb-2">🔒</div>
            <p className="font-bold text-gray-700 mb-1">Pronostic verrouillé</p>
            <p className="text-gray-500 text-sm mb-3">Ton pronostic :</p>
            <p className="font-mono text-4xl font-bold text-[#00A650]">
              {prediction.home_score_pred} – {prediction.away_score_pred}
            </p>
          </div>
        ) : locked && !prediction ? (
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="font-bold text-gray-700 mb-1">Pronostic verrouillé</p>
            <p className="text-gray-400 text-sm mt-2">Tu n&apos;as pas pronostiqué ce match.</p>
          </div>
        ) : prediction ? (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 text-center">
              <p className="text-sm text-[#00A650] font-semibold mb-1">✓ Pronostic enregistré</p>
              <p className="font-mono text-3xl font-bold text-[#0D1B2E]">
                {prediction.home_score_pred} – {prediction.away_score_pred}
              </p>
              <p className="text-xs text-gray-400 mt-1">Tu peux le modifier jusqu&apos;au coup de sifflet</p>
            </div>
            <PredictionForm matchId={matchId} leagueId={id} existingPrediction={prediction} kickoffAt={m.kickoff_at} />
          </div>
        ) : (
          <PredictionForm matchId={matchId} leagueId={id} existingPrediction={null} kickoffAt={m.kickoff_at} />
        )}

        {/* Section Pronostic Buteur — spec 5A */}
        {prediction && players.length > 0 && (
          <ScorerForm
            predictionId={prediction.id}
            players={players}
            currentPlayerId={currentScorerPrediction?.player_id ?? null}
            locked={locked ?? false}
          />
        )}

        {/* Pronostics de toute la ligue — visibles après verrouillage */}
        {(locked || finished) && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="bg-[#0D1B2E] px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-white text-sm">Pronostics de la ligue</span>
              <span className="text-xs text-gray-400">{allPredictions.length} pronostic{allPredictions.length > 1 ? "s" : ""}</span>
            </div>

            {!allPredictions.length ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Aucun pronostic pour ce match.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {allPredictions.map((p: any, i: number) => {
                  const isMe = p.user_id === user.id;
                  const pointsBg =
                    p.points_earned === 3 ? "bg-yellow-50 text-yellow-600" :
                    p.points_earned === 1 ? "bg-green-50 text-[#00A650]" :
                    p.points_earned === 0 ? "bg-gray-50 text-gray-400" :
                    "bg-gray-50 text-gray-400";

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-green-50/50" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#0D1B2E] flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {(p.username?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="flex-1 font-semibold text-sm text-[#0D1B2E]">
                        {p.username} {isMe && <span className="text-[10px] text-[#00A650] font-bold">(moi)</span>}
                      </span>
                      <span className="font-mono font-bold text-[#0D1B2E] text-sm">
                        {p.home_score_pred} – {p.away_score_pred}
                      </span>
                      {finished && p.points_earned != null && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pointsBg}`}>
                          {p.points_earned === 3 ? "⭐" : p.points_earned === 1 ? "✓" : "✗"} {p.points_earned}pt
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
