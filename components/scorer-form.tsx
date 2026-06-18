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
  photo_url: string | null;
}

interface ScorerFormProps {
  predictionId: string;
  players: Player[];
  currentPlayerId: string | null;
  locked: boolean;
}

export function ScorerForm({ predictionId, players, currentPlayerId, locked }: ScorerFormProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(currentPlayerId ?? "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (players.length === 0) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (currentPlayerId) {
      // Mise à jour du pronostic buteur existant
      const { error: updateError } = await supabase
        .from("scorer_predictions")
        .update({ player_id: selectedId })
        .eq("prediction_id", predictionId);

      if (updateError) {
        setError("Impossible de mettre à jour le buteur pronostiqué.");
        setLoading(false);
        return;
      }
    } else {
      // Nouveau pronostic buteur
      const { error: insertError } = await supabase
        .from("scorer_predictions")
        .insert({ prediction_id: predictionId, player_id: selectedId });

      if (insertError) {
        setError("Impossible d'enregistrer. Le match a peut-être commencé.");
        setLoading(false);
        return;
      }
    }

    setSuccess(true);
    setTimeout(() => router.refresh(), 1000);
    setLoading(false);
  }

  // Grouper les joueurs par équipe pour l'affichage dans le select
  const homeTeam = players[0]?.team_name ?? "";
  const awayTeam = players.find((p) => p.team_name !== homeTeam)?.team_name ?? "";

  const byTeam: Record<string, Player[]> = {};
  for (const p of players) {
    if (!byTeam[p.team_name]) byTeam[p.team_name] = [];
    byTeam[p.team_name].push(p);
  }

  if (locked && !currentPlayerId) {
    return (
      <div className="bg-white rounded-2xl shadow p-5 text-center">
        <p className="text-gray-400 text-sm">⚽ Pas de buteur pronostiqué pour ce match.</p>
      </div>
    );
  }

  if (locked) {
    const player = players.find((p) => p.id === currentPlayerId);
    return (
      <div className="bg-white rounded-2xl shadow p-5 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Buteur pronostiqué</p>
        <p className="font-bold text-[#0D1B2E] text-lg">⚽ {player?.name ?? "Inconnu"}</p>
        <p className="text-xs text-gray-400">{player?.team_name}</p>
        <p className="text-[10px] text-gray-300 mt-2">🔒 Bonus calculé après le match</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h3 className="font-bold text-[#0D1B2E] text-sm mb-1">⚽ Pronostic Buteur</h3>
      <p className="text-xs text-gray-400 mb-4">+1 point bonus si ton buteur marque</p>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-center">
          <p className="text-[#00A650] font-bold text-sm">✓ Buteur enregistré !</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <p className="text-[#E8192C] text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A1A]
                     focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
          required
        >
          <option value="">— Choisir un buteur —</option>
          {Object.entries(byTeam).map(([team, teamPlayers]) => (
            <optgroup key={team} label={team}>
              {teamPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.position ? ` (${p.position})` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading || !selectedId}
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700
                     disabled:opacity-50 disabled:scale-100
                     text-white font-bold px-4 py-2.5 rounded-lg transition-all
                     hover:scale-105 active:scale-95 text-sm"
        >
          <span>⚽</span>
          <span>{loading ? "Enregistrement…" : currentPlayerId ? "Modifier mon buteur" : "Valider mon buteur"}</span>
        </button>
      </form>
    </div>
  );
}
