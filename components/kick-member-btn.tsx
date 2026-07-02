"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface KickMemberBtnProps {
  leagueId: string;
  userId: string;
  username: string;
}

export function KickMemberBtn({ leagueId, userId, username }: KickMemberBtnProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function kick() {
    if (!confirm(`Retirer ${username} de la ligue ?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Erreur");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={kick}
      disabled={loading}
      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      style={{ background: "rgba(232,25,44,0.15)", color: "#E8192C", border: "1px solid rgba(232,25,44,0.3)" }}
    >
      {loading ? "…" : "Retirer"}
    </button>
  );
}
