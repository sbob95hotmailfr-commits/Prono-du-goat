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
import { AiMatchCard } from "@/components/ai-match-card";
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

  const adminForPred = createAdminClient();
  const { data: predictionData } = await adminForPred
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

  // Charger les pronostics buteur existants (multi-slots)
  let currentScorers: any[] = [];
  if (prediction?.id) {
    const { data: sp } = await adminSupabaseGlobal
      .from("scorer_predictions")
      .select("player_id, slot, team")
      .eq("prediction_id", prediction.id) as any;
    currentScorers = sp ?? [];
  }

  // Charger l'analyse IA en cache (pré-match ou débrief)
  const { data: aiAnalysis } = await adminSupabaseGlobal
    .from("match_ai_analyses")
    .select("type, content")
    .eq("match_id", matchId)
    .in("type", ["prematch", "debrief"]) as any;

  const prematchAnalysis = (aiAnalysis ?? []).find((a: any) => a.type === "prematch")?.content ?? null;
  const debriefAnalysis = (aiAnalysis ?? []).find((a: any) => a.type === "debrief")?.content ?? null;

  // Pronostic IA (visible après verrouillage)
  let aiPrediction: any = null;
  let aiScorerNames: string[] = [];
  if (locked || finished) {
    const { data: aiPred } = await adminSupabaseGlobal
      .from("ai_match_predictions")
      .select("home_score_pred, away_score_pred, points_earned, reasoning")
      .eq("match_id", matchId).single() as any;
    aiPrediction = aiPred ?? null;

    if (aiPred) {
      const { data: aiScorers } = await adminSupabaseGlobal
        .from("ai_scorer_predictions")
        .select("player_id, players(name)")
        .eq("match_id", matchId) as any;
      aiScorerNames = (aiScorers ?? []).map((s: any) => s.players?.name).filter(Boolean);
    }
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
    <div className="min-h-screen" style={{ background: "#0A1628" }}>
      <WcNav leagueId={id} leagueName={m.stage} isAdmin={isAdmin} activeTab="matches" />

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">

        {/* Affiche du match */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-4 py-2 text-center" style={{ background: "#0D1B2E" }}>
            <p className="text-xs text-gray-400 uppercase tracking-widest">{formatDate(m.kickoff_at)}</p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 text-center">
                <div className="flex justify-center mb-3">
                  <FlagImage team={m.home_team} size="lg" className="rounded-xl shadow-md w-16 h-12 object-cover border border-white/10" />
                </div>
                <p className={`font-bold text-sm ${m.penalty_winner === "home" && finished ? "text-[#00A650]" : "text-white"}`}>
                  {m.penalty_winner === "home" && finished && <span className="mr-1">↑</span>}
                  {m.home_team}
                </p>
              </div>

              {finished && m.home_score != null ? (
                <div className="text-center px-2">
                  <div className="rounded-xl px-5 py-3" style={{ background: "#0D1B2E" }}>
                    <p className="font-mono text-3xl font-bold text-white tracking-widest">
                      {m.home_score} – {m.away_score}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider">
                    {m.penalty_winner ? "Score final · t.a.b" : "Score final"}
                  </p>
                </div>
              ) : (
                <div className="text-center px-4">
                  <div className="rounded-xl px-4 py-2" style={{ border: "2px dashed rgba(255,255,255,0.12)" }}>
                    <span className="font-bold text-xl" style={{ color: "rgba(255,255,255,0.2)" }}>VS</span>
                  </div>
                </div>
              )}

              <div className="flex-1 text-center">
                <div className="flex justify-center mb-3">
                  <FlagImage team={m.away_team} size="lg" className="rounded-xl shadow-md w-16 h-12 object-cover border border-white/10" />
                </div>
                <p className={`font-bold text-sm ${m.penalty_winner === "away" && finished ? "text-[#00A650]" : "text-white"}`}>
                  {m.away_team}
                  {m.penalty_winner === "away" && finished && <span className="ml-1">↑</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Zone pronostic perso */}
        {finished && prediction ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Mon pronostic</p>
            <p className="font-mono text-5xl font-bold text-white mb-4">
              {prediction.home_score_pred} – {prediction.away_score_pred}
            </p>
            {prediction.points_earned != null && (
              <>
                {prediction.points_earned >= 3 && (
                  <>
                    <div className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full" style={{ background: "rgba(245,166,35,0.15)", border: "1px solid rgba(245,166,35,0.3)", color: "#F5A623" }}>
                      ⭐ +{prediction.points_earned} points !
                    </div>
                    <ConfettiClient />
                  </>
                )}
                {prediction.points_earned > 0 && prediction.points_earned < 3 && (
                  <div className="inline-flex text-sm font-bold px-4 py-2 rounded-full" style={{ background: "rgba(0,166,80,0.15)", border: "1px solid rgba(0,166,80,0.3)", color: "#00A650" }}>
                    ✓ Bon résultat — +{prediction.points_earned} point{prediction.points_earned > 1 ? "s" : ""}
                  </div>
                )}
                {prediction.points_earned === 0 && (
                  <div className="inline-flex text-sm font-bold px-4 py-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#6b7280" }}>
                    ✗ Raté — 0 point
                  </div>
                )}
              </>
            )}
          </div>
        ) : finished && !prediction ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-gray-500 text-sm">Tu n&apos;as pas pronostiqué ce match.</p>
          </div>
        ) : locked && prediction ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-3xl mb-2">🔒</div>
            <p className="font-bold text-white mb-1">Pronostic verrouillé</p>
            <p className="text-gray-500 text-sm mb-3">Ton pronostic :</p>
            <p className="font-mono text-4xl font-bold" style={{ color: "#00A650" }}>
              {prediction.home_score_pred} – {prediction.away_score_pred}
            </p>
          </div>
        ) : locked && !prediction ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-4xl mb-3">🔒</div>
            <p className="font-bold text-white mb-1">Pronostic verrouillé</p>
            <p className="text-gray-500 text-sm mt-2">Tu n&apos;as pas pronostiqué ce match.</p>
          </div>
        ) : prediction ? (
          <div>
            <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: "rgba(0,166,80,0.1)", border: "1px solid rgba(0,166,80,0.25)" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "#00A650" }}>✓ Pronostic enregistré</p>
              <p className="font-mono text-3xl font-bold text-white">
                {prediction.home_score_pred} – {prediction.away_score_pred}
              </p>
              <p className="text-xs text-gray-500 mt-1">Tu peux le modifier jusqu&apos;au coup de sifflet</p>
            </div>
            <PredictionForm
              matchId={matchId} leagueId={id}
              existingPrediction={prediction} kickoffAt={m.kickoff_at}
              players={players} homeTeam={m.home_team} awayTeam={m.away_team}
            />
          </div>
        ) : (
          <PredictionForm
            matchId={matchId} leagueId={id}
            existingPrediction={null} kickoffAt={m.kickoff_at}
            players={players} homeTeam={m.home_team} awayTeam={m.away_team}
          />
        )}

        {/* Section Pronostic Buteur */}
        {prediction && players.length > 0 && (
          <ScorerForm
            predictionId={prediction.id}
            leagueId={id}
            players={players}
            homeTeam={m.home_team}
            awayTeam={m.away_team}
            homeGoals={prediction.home_score_pred ?? 0}
            awayGoals={prediction.away_score_pred ?? 0}
            currentScorers={currentScorers}
            locked={locked ?? false}
          />
        )}

        {/* Agent IA pré-match (avant le coup d'envoi) */}
        {!locked && !finished && (
          <AiMatchCard
            matchId={matchId}
            leagueId={id}
            type="prematch"
            cachedContent={prematchAnalysis}
          />
        )}

        {/* Débrief IA post-match */}
        {finished && (
          <AiMatchCard
            matchId={matchId}
            leagueId={id}
            type="debrief"
            cachedContent={debriefAnalysis}
          />
        )}

        {/* Pronostic GOAT IA — visible après verrouillage */}
        {(locked || finished) && aiPrediction && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(245,166,35,0.2)" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#0D1B2E" }}>
              <span className="text-base">🤖</span>
              <span className="font-bold text-sm" style={{ color: "#F5A623" }}>GOAT IA</span>
              <span className="text-xs text-gray-500 ml-auto">Pronostic IA</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono font-black text-2xl text-white">
                  {aiPrediction.home_score_pred} – {aiPrediction.away_score_pred}
                </span>
                {finished && aiPrediction.points_earned != null && (
                  <span className="text-sm font-bold px-3 py-1 rounded-full" style={{
                    background: aiPrediction.points_earned >= 3 ? "rgba(245,166,35,0.15)" : aiPrediction.points_earned > 0 ? "rgba(0,166,80,0.15)" : "rgba(255,255,255,0.06)",
                    color: aiPrediction.points_earned >= 3 ? "#F5A623" : aiPrediction.points_earned > 0 ? "#00A650" : "#6b7280",
                  }}>
                    {aiPrediction.points_earned > 0 ? `+${aiPrediction.points_earned} pts` : "0 pt"}
                  </span>
                )}
              </div>
              {aiScorerNames.length > 0 && (
                <p className="text-xs text-gray-400 mb-2">
                  ⚽ Buteurs prédits : {aiScorerNames.join(", ")}
                </p>
              )}
              {aiPrediction.reasoning && (
                <p className="text-xs text-gray-500 italic">{aiPrediction.reasoning}</p>
              )}
            </div>
          </div>
        )}

        {/* Pronostics de toute la ligue — visibles après verrouillage */}
        {(locked || finished) && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#0D1B2E" }}>
              <span className="font-bold text-white text-sm">Pronostics de la ligue</span>
              <span className="text-xs text-gray-400">{allPredictions.length} pronostic{allPredictions.length > 1 ? "s" : ""}</span>
            </div>

            {!allPredictions.length ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Aucun pronostic pour ce match.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {allPredictions.map((p: any, i: number) => {
                  const isMe = p.user_id === user.id;
                  const pointsStyle =
                    (p.points_earned ?? 0) >= 3 ? { background: "rgba(245,166,35,0.15)", color: "#F5A623" } :
                    (p.points_earned ?? 0) > 0 ? { background: "rgba(0,166,80,0.15)", color: "#00A650" } :
                    { background: "rgba(255,255,255,0.06)", color: "#6b7280" };

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3"
                      style={isMe ? { background: "rgba(0,166,80,0.06)" } : {}}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: "#0D1B2E" }}>
                        {(p.username?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="flex-1 font-semibold text-sm text-white">
                        {p.username} {isMe && <span className="text-[10px] font-bold" style={{ color: "#00A650" }}>(moi)</span>}
                      </span>
                      <span className="font-mono font-bold text-white text-sm">
                        {p.home_score_pred} – {p.away_score_pred}
                      </span>
                      {finished && p.points_earned != null && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={pointsStyle}>
                          {(p.points_earned ?? 0) >= 3 ? "⭐" : (p.points_earned ?? 0) > 0 ? "✓" : "✗"} {p.points_earned}pt
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
