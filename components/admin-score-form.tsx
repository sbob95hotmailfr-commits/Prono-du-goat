"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const KNOCKOUT_STAGES = [
  "Seizièmes de finale", "Huitièmes de finale",
  "Quarts de finale", "Demi-finales", "Finale",
];

interface AdminScoreFormProps {
  matchId: string;
  homeFlag: string;
  awayFlag: string;
  homeTeam?: string;
  awayTeam?: string;
  stage?: string;
  initialHome?: number;
  initialAway?: number;
}

export function AdminScoreForm({ matchId, homeFlag, awayFlag, homeTeam, awayTeam, stage, initialHome = 0, initialAway = 0 }: AdminScoreFormProps) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(initialHome);
  const [awayScore, setAwayScore] = useState(initialAway);
  const [winner, setWinner] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isKnockout = stage ? KNOCKOUT_STAGES.includes(stage) : false;
  const isDraw = homeScore === awayScore;
  const needsWinner = isKnockout && isDraw;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsWinner && !winner) {
      setError("Sélectionne le vainqueur aux tirs au but.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeScore, awayScore, winner: needsWinner ? winner : undefined }),
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
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <p className="text-danger text-xs">{error}</p>}
      <div className="flex items-center gap-2">
        <span className="text-sm shrink-0">{homeFlag}</span>
        <input
          type="number" min={0} max={20} value={homeScore}
          onChange={(e) => { setHomeScore(parseInt(e.target.value) || 0); setWinner(""); }}
          className="w-14 text-center font-mono text-lg font-bold border border-border rounded-lg py-2 focus:outline-none focus:border-primary"
        />
        <span className="text-muted font-bold">–</span>
        <input
          type="number" min={0} max={20} value={awayScore}
          onChange={(e) => { setAwayScore(parseInt(e.target.value) || 0); setWinner(""); }}
          className="w-14 text-center font-mono text-lg font-bold border border-border rounded-lg py-2 focus:outline-none focus:border-primary"
        />
        <span className="text-sm shrink-0">{awayFlag}</span>
        <button type="submit" disabled={loading} className="btn-primary text-sm px-4 py-2 shrink-0 ml-auto">
          {loading ? "…" : "Valider"}
        </button>
      </div>
      {needsWinner && homeTeam && awayTeam && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700 font-semibold mb-2">⚽ Score nul — Qui gagne aux tirs au but ?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWinner(homeTeam)}
              className={`flex-1 text-sm font-semibold py-2 px-3 rounded-lg border transition-colors ${winner === homeTeam ? "bg-primary text-white border-primary" : "border-border text-dark hover:border-primary"}`}
            >
              {homeFlag} {homeTeam}
            </button>
            <button
              type="button"
              onClick={() => setWinner(awayTeam)}
              className={`flex-1 text-sm font-semibold py-2 px-3 rounded-lg border transition-colors ${winner === awayTeam ? "bg-primary text-white border-primary" : "border-border text-dark hover:border-primary"}`}
            >
              {awayFlag} {awayTeam}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
