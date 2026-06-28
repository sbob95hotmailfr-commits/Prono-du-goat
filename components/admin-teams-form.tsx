"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}

export function AdminTeamsForm({ matchId, homeTeam, awayTeam }: Props) {
  const router = useRouter();
  const [home, setHome] = useState(homeTeam);
  const [away, setAway] = useState(awayTeam);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/match-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeTeam: home, awayTeam: away }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur serveur");
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.refresh(), 500);
  }

  if (done) return <p className="text-xs text-primary font-semibold mt-1">✅ Équipes mises à jour</p>;

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2 flex-wrap">
      <input
        value={home}
        onChange={(e) => setHome(e.target.value)}
        placeholder="Équipe domicile"
        className="border border-border rounded px-2 py-1 text-sm flex-1 min-w-[120px] focus:outline-none focus:border-primary"
      />
      <span className="text-muted text-sm font-bold">vs</span>
      <input
        value={away}
        onChange={(e) => setAway(e.target.value)}
        placeholder="Équipe extérieur"
        className="border border-border rounded px-2 py-1 text-sm flex-1 min-w-[120px] focus:outline-none focus:border-primary"
      />
      <button type="submit" disabled={loading} className="btn-primary text-xs px-3 py-1 shrink-0">
        {loading ? "…" : "Mettre à jour"}
      </button>
      {error && <p className="text-danger text-xs w-full">{error}</p>}
    </form>
  );
}
