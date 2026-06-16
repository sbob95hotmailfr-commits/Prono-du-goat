"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminScoreFormProps {
  matchId: string;
  homeFlag: string;
  awayFlag: string;
}

export function AdminScoreForm({ matchId, homeFlag, awayFlag }: AdminScoreFormProps) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeScore, awayScore }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Erreur serveur (${res.status})`);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.refresh(), 500);
  }

  if (done) {
    return <p className="text-sm text-primary font-semibold">✅ Score enregistré ! Points calculés.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      {error && <p className="text-danger text-xs">{error}</p>}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm shrink-0">{homeFlag}</span>
        <input
          type="number" min={0} max={20} value={homeScore}
          onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
          className="w-14 text-center font-mono text-lg font-bold border border-border rounded-lg py-2 focus:outline-none focus:border-primary"
        />
        <span className="text-muted font-bold">–</span>
        <input
          type="number" min={0} max={20} value={awayScore}
          onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
          className="w-14 text-center font-mono text-lg font-bold border border-border rounded-lg py-2 focus:outline-none focus:border-primary"
        />
        <span className="text-sm shrink-0">{awayFlag}</span>
      </div>
      <button type="submit" disabled={loading} className="btn-primary text-sm px-4 py-2 shrink-0">
        {loading ? "…" : "Valider"}
      </button>
    </form>
  );
}
