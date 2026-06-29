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
    setTimeout(() => router.refresh(), 1200);
  }

  if (success) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex justify-center mb-3">
          <div className="ball-frozen" style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "3px solid #00A650", boxShadow: "0 0 16px rgba(0,166,80,0.4)" }}>
            <Image src="/ball.png" alt="Pronostic enregistré" width={80} height={80} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </div>
        </div>
        <p className="font-bold text-white">Pronostic enregistré !</p>
        <p className="font-mono text-2xl font-bold mt-1" style={{ color: "#00A650" }}>
          {homeScore} – {awayScore}
        </p>
        <p className="text-xs text-gray-500 mt-2">Tu peux maintenant pronostiquer les buteurs ci-dessous</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h2 className="font-bold text-white text-center mb-6">
        {existingPrediction ? "Modifier mon pronostic" : "Mon pronostic"}
      </h2>

      {error && (
        <div className="text-sm rounded-lg p-3 mb-4" style={{ background: "rgba(232,25,44,0.1)", border: "1px solid rgba(232,25,44,0.3)", color: "#E8192C" }}>
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
              className="font-mono text-2xl text-center w-12 bg-transparent text-white border-b-2 focus:outline-none"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            />
          </div>

          <span className="text-2xl font-bold text-white/30">–</span>

          <div className="text-center">
            <input
              type="number"
              min={0}
              max={20}
              value={awayScore}
              onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
              className="font-mono text-2xl text-center w-12 bg-transparent text-white border-b-2 focus:outline-none"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            />
          </div>
        </div>

        {/* Boutons +/- pour mobile */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
              className="w-8 h-8 rounded-full text-lg font-bold text-gray-400 transition-colors hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}>−</button>
            <span className="font-mono font-bold w-6 text-center text-white">{homeScore}</span>
            <button type="button" onClick={() => setHomeScore(Math.min(20, homeScore + 1))}
              className="w-8 h-8 rounded-full text-lg font-bold text-gray-400 transition-colors hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}>+</button>
          </div>

          <span className="w-4" />

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
              className="w-8 h-8 rounded-full text-lg font-bold text-gray-400 transition-colors hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}>−</button>
            <span className="font-mono font-bold w-6 text-center text-white">{awayScore}</span>
            <button type="button" onClick={() => setAwayScore(Math.min(20, awayScore + 1))}
              className="w-8 h-8 rounded-full text-lg font-bold text-gray-400 transition-colors hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}>+</button>
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
