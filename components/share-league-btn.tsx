"use client";

import { useState } from "react";

export function ShareLeagueBtn({ leagueId }: { leagueId: string }) {
  const [copied, setCopied] = useState(false);

  function share() {
    const url = `${window.location.origin}/share/${leagueId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={share}
      className="w-full text-xs font-semibold py-2 rounded-lg transition-colors"
      style={{
        background: copied ? "rgba(0,166,80,0.15)" : "rgba(245,166,35,0.12)",
        color: copied ? "#00A650" : "#F5A623",
        border: `1px solid ${copied ? "rgba(0,166,80,0.3)" : "rgba(245,166,35,0.25)"}`,
      }}
    >
      {copied ? "✓ Lien copié !" : "🔗 Partager le classement"}
    </button>
  );
}
