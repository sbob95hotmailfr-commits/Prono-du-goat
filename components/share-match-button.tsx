"use client";

import { useState } from "react";

interface Props {
  matchId: string;
  leagueId: string;
  userId: string;
  homeTeam: string;
  awayTeam: string;
}

export function ShareMatchButton({ matchId, leagueId, userId, homeTeam, awayTeam }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const base = window.location.origin;
    const imageUrl = `${base}/api/og/match/${matchId}?leagueId=${leagueId}&userId=${userId}`;
    const pageUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${homeTeam} vs ${awayTeam} — Le Prono du GOAT`,
          text: "Mon pronostic sur Le Prono du GOAT ⚽",
          url: pageUrl,
        });
        return;
      } catch {
        // annulé par l'utilisateur
        return;
      }
    }

    // Fallback : copier le lien de l'image
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // rien
    }
  }

  return (
    <button
      onClick={share}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
      style={{
        background: "rgba(96,165,250,0.1)",
        border: "1px solid rgba(96,165,250,0.25)",
        color: "#60a5fa",
      }}
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>Lien copié !</span>
        </>
      ) : (
        <>
          <span>📤</span>
          <span>Partager mon pronostic</span>
        </>
      )}
    </button>
  );
}
