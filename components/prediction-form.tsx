// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Prediction } from "@/types/database";

interface PredictionFormProps {
  matchId: string;
  leagueId: string;
  existingPrediction: Prediction | null;
  kickoffAt: string;
}

export function PredictionForm({ matchId, leagueId, existingPrediction, kickoffAt }: PredictionFormProps) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(existingPrediction?.home_score_pred ?? 0);
  const [awayScore, setAwayScore] = useState(existingPrediction?.away_score_pred ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Vérification côté client : le match n'a pas encore commencé
    if (new Date(kickoffAt) <= new Date()) {
      setError("⚠️ Ce match a déjà commencé. Pronostic impossible.");
      setLoading(false);
      return;
    }

    if (existingPrediction) {
      // Modifier le pronostic existant
      const { error: updateError } = await supabase
        .from("predictions")
        .update({ home_score_pred: homeScore, away_score_pred: awayScore })
        .eq("id", existingPrediction.id)
        .eq("is_locked", false); // sécurité supplémentaire

      if (updateError) {
        setError("Impossible de modifier. Le pronostic est peut-être verrouillé.");
        setLoading(false);
        return;
      }
    } else {
      // Créer un nouveau pronostic
      const { error: insertError } = await supabase
        .from("predictions")
        .insert({
          user_id: user.id,
          match_id: matchId,
          league_id: leagueId,
          home_score_pred: homeScore,
          away_score_pred: awayScore,
        });

      if (insertError) {
        setError("Impossible d'enregistrer. Le match a peut-être déjà commencé.");
        setLoading(false);
        return;
      }
    }

    setSuccess(true);
    setTimeout(() => router.push(`/leagues/${leagueId}`), 1200);
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="ball-frozen" style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "3px solid #00A650", boxShadow: "0 0 16px rgba(0,166,80,0.4)" }}>
            <Image src="/ball.png" alt="Pronostic enregistré" width={80} height={80} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </div>
        </div>
        <p className="font-bold text-gray-800">Pronostic enregistré !</p>
        <p className="font-mono text-2xl font-bold text-green-600 mt-1">
          {homeScore} – {awayScore}
        </p>
        <p className="text-xs text-gray-400 mt-2">Redirection en cours…</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="font-bold text-dark text-center mb-6">
        {existingPrediction ? "Modifier mon pronostic" : "Mon pronostic"}
      </h2>

      {error && (
        <div className="bg-red-50 border border-danger text-danger text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Saisie du score */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="text-center">
            <input
              type="number"
              min={0}
              max={20}
              value={homeScore}
              onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="score-input"
            />
          </div>

          <span className="text-2xl text-muted font-bold">–</span>

          <div className="text-center">
            <input
              type="number"
              min={0}
              max={20}
              value={awayScore}
              onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="score-input"
            />
          </div>
        </div>

        {/* Boutons +/- pour mobile */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
              className="w-8 h-8 rounded-full border border-border text-lg font-bold text-muted hover:border-primary hover:text-primary transition-colors">−</button>
            <span className="font-mono font-bold w-6 text-center">{homeScore}</span>
            <button type="button" onClick={() => setHomeScore(Math.min(20, homeScore + 1))}
              className="w-8 h-8 rounded-full border border-border text-lg font-bold text-muted hover:border-primary hover:text-primary transition-colors">+</button>
          </div>

          <span className="w-4" />

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
              className="w-8 h-8 rounded-full border border-border text-lg font-bold text-muted hover:border-primary hover:text-primary transition-colors">−</button>
            <span className="font-mono font-bold w-6 text-center">{awayScore}</span>
            <button type="button" onClick={() => setAwayScore(Math.min(20, awayScore + 1))}
              className="w-8 h-8 rounded-full border border-border text-lg font-bold text-muted hover:border-primary hover:text-primary transition-colors">+</button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex flex-col items-center gap-1 w-full disabled:opacity-60 transition-all"
        >
          <div
            className={loading ? "ball-frozen" : "ball-beat"}
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid #F5A623",
              boxShadow: "0 0 16px rgba(245,166,35,0.5)",
            }}
          >
            <Image
              src="/ball.png"
              alt="Pronostiquer"
              width={72}
              height={72}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          </div>
          <span className="text-sm font-black uppercase tracking-widest" style={{ color: "#F5A623" }}>
            {loading ? "Enregistrement…" : existingPrediction ? "Mettre à jour" : "Pronostiquer"}
          </span>
        </button>
      </form>
    </div>
  );
}
