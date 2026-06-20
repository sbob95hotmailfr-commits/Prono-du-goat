// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Player {
  id: string;
  name: string;
  team_name: string;
  position: string | null;
}

interface ScorerEntry {
  player_id: string;
  slot: number;
  team: string;
}

interface ScorerFormProps {
  predictionId: string;
  players: Player[];
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  currentScorers: ScorerEntry[];
  locked: boolean;
}

function buildInitialSlots(
  team: string,
  goals: number,
  current: ScorerEntry[]
): string[] {
  const slots = Array(Math.max(1, goals)).fill("");
  current
    .filter((s) => s.team === team)
    .forEach((s) => {
      const idx = s.slot - 1;
      if (idx >= 0 && idx < slots.length) slots[idx] = s.player_id;
    });
  return slots;
}

export function ScorerForm({
  predictionId,
  players,
  homeTeam,
  awayTeam,
  homeGoals,
  awayGoals,
  currentScorers,
  locked,
}: ScorerFormProps) {
  const router = useRouter();

  const [homeSlots, setHomeSlots] = useState<string[]>(() =>
    buildInitialSlots(homeTeam, homeGoals, currentScorers)
  );
  const [awaySlots, setAwaySlots] = useState<string[]>(() =>
    buildInitialSlots(awayTeam, awayGoals, currentScorers)
  );

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const homePlayers = players.filter((p) => p.team_name === homeTeam);
  const awayPlayers = players.filter((p) => p.team_name === awayTeam);

  // Pas de buteurs possibles si les deux équipes ont 0 but prédit
  if (players.length === 0 || (homeGoals === 0 && awayGoals === 0)) return null;

  // Vue verrouillée
  if (locked) {
    const allScorers = currentScorers.filter((s) => s.player_id);
    if (!allScorers.length) {
      return (
        <div className="rounded-2xl p-5 text-center" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-gray-500 text-sm">⚽ Pas de buteur pronostiqué pour ce match.</p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl p-5" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Buteurs pronostiqués</p>
        <div className="space-y-2">
          {allScorers.map((s, i) => {
            const player = players.find((p) => p.id === s.player_id);
            return (
              <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                <span className="text-white text-sm font-semibold">⚽ {player?.name ?? "?"}</span>
                <span className="text-gray-500 text-xs">{s.team}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-600 mt-3 text-center">🔒 Bonus calculé après le match</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Construire toutes les entrées (slots remplis uniquement)
    const entries: { prediction_id: string; player_id: string; slot: number; team: string }[] = [];
    homeSlots.forEach((playerId, i) => {
      if (playerId) entries.push({ prediction_id: predictionId, player_id: playerId, slot: i + 1, team: homeTeam });
    });
    awaySlots.forEach((playerId, i) => {
      if (playerId) entries.push({ prediction_id: predictionId, player_id: playerId, slot: i + 1, team: awayTeam });
    });

    // Upsert : met à jour si (prediction_id, slot, team) existe déjà
    // D'abord vider les slots qui ne sont plus utilisés via l'API serveur
    const res = await fetch("/api/scorer/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId, entries }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Impossible d'enregistrer les buteurs.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => { setSuccess(false); router.refresh(); }, 1500);
  }

  function renderTeamSlots(
    team: string,
    goals: number,
    slots: string[],
    setSlots: (s: string[]) => void,
    teamPlayers: Player[]
  ) {
    if (goals === 0) return null;

    return (
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-bold text-sm">{team}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623" }}>
            {goals} but{goals > 1 ? "s" : ""}
          </span>
          <span className="text-gray-600 text-xs">→ {goals} buteur{goals > 1 ? "s" : ""} possible{goals > 1 ? "s" : ""}</span>
        </div>

        <div className="space-y-2">
          {slots.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-600 text-xs w-4 shrink-0">#{i + 1}</span>
              <select
                value={val}
                onChange={(e) => {
                  const next = [...slots];
                  next[i] = e.target.value;
                  setSlots(next);
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                style={{ background: "#0D1B2E", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <option value="">— Optionnel —</option>
                {teamPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.position ? ` · ${p.position}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasAnySelection = homeSlots.some(Boolean) || awaySlots.some(Boolean);

  return (
    <div className="rounded-2xl p-5" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="mb-4">
        <h3 className="font-bold text-white text-sm">⚽ Pronostic Buteurs</h3>
        <p className="text-xs text-gray-500 mt-0.5">+3 pts si tous les buteurs trouvés · +1 pt si au moins un</p>
      </div>

      {success && (
        <div className="rounded-lg p-3 mb-3 text-center" style={{ background: "rgba(0,166,80,0.1)", border: "1px solid rgba(0,166,80,0.25)" }}>
          <p className="font-bold text-sm" style={{ color: "#00A650" }}>✓ Buteurs enregistrés !</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(232,25,44,0.1)", border: "1px solid rgba(232,25,44,0.25)" }}>
          <p className="text-sm" style={{ color: "#E8192C" }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-1">
        {renderTeamSlots(homeTeam, homeGoals, homeSlots, setHomeSlots, homePlayers)}

        {homeGoals > 0 && awayGoals > 0 && (
          <div className="my-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
        )}

        {renderTeamSlots(awayTeam, awayGoals, awaySlots, setAwaySlots, awayPlayers)}

        <button
          type="submit"
          disabled={loading}
          className="w-full font-bold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 mt-2"
          style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.25)" }}
        >
          {loading ? "Enregistrement…" : hasAnySelection ? "✓ Valider mes buteurs" : "Passer (aucun buteur)"}
        </button>
      </form>
    </div>
  );
}
