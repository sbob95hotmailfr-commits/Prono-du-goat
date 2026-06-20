"use client";

import { useState } from "react";

interface Props {
  leagueId: string;
  isAdmin: boolean;
  existingSummary: string | null;
  summaryDate: string | null;
}

export function DailySummarySection({ leagueId, isAdmin, existingSummary, summaryDate }: Props) {
  const [summary, setSummary] = useState(existingSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setSummary(data.summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  }

  if (!summary && !isAdmin) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#0D1B2E" }}>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">Résumé IA</p>
          <p className="font-bold text-white text-sm">La journée par Claude</p>
        </div>
        <span className="text-lg">🤖</span>
      </div>

      <div className="p-4">
        {summary ? (
          <>
            <p className="text-sm text-gray-300 leading-relaxed italic">&ldquo;{summary}&rdquo;</p>
            {summaryDate && (
              <p className="text-[10px] text-gray-600 mt-3">
                Généré le {new Date(summaryDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              </p>
            )}
            {isAdmin && (
              <button
                onClick={generate}
                disabled={loading}
                className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.25)" }}
              >
                {loading ? "Génération…" : "🔄 Actualiser"}
              </button>
            )}
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-gray-500 text-sm mb-3">Aucun résumé aujourd&apos;hui</p>
            {isAdmin && (
              <>
                <p className="text-gray-600 text-xs mb-3">Génère le résumé IA après les matchs du soir</p>
                <button
                  onClick={generate}
                  disabled={loading}
                  className="text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.25)" }}
                >
                  {loading ? "Génération en cours…" : "✨ Générer le résumé du jour"}
                </button>
                {error && <p className="text-xs mt-2" style={{ color: "#E8192C" }}>{error}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
