"use client";

import { useState } from "react";

export function AiTipsCard({ leagueId }: { leagueId: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setContent(data.content);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#0D1B2E" }}>
        <span>💡</span>
        <span className="font-bold text-white text-sm">Conseils IA personnalisés</span>
      </div>

      <div className="p-4">
        {content ? (
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{content}</p>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : (
          <div className="text-center py-2">
            <p className="text-gray-500 text-xs mb-3">
              Claude analyse tes habitudes de pronostic et te donne 3 conseils personnalisés pour progresser.
            </p>
            <button
              onClick={generate}
              disabled={loading}
              className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }}
            >
              {loading ? "Analyse en cours…" : "✨ Obtenir mes conseils"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
