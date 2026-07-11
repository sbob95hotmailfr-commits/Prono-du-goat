"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";

type Player = { id: string; name: string; team_name: string };
type MatchData = {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  home_score: number | null;
  away_score: number | null;
  currentScorerIds: string[];
};

export function AdminScorerManager({
  matches,
  players,
}: {
  matches: MatchData[];
  players: Player[];
}) {
  const [scorerMap, setScorerMap] = useState<Record<string, string[]>>(
    Object.fromEntries(matches.map((m) => [m.id, m.currentScorerIds]))
  );
  const [searchMap, setSearchMap] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [resultMap, setResultMap] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const playerById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  function addScorer(matchId: string, playerId: string) {
    setScorerMap((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] ?? []), playerId],
    }));
    setSearchMap((prev) => ({ ...prev, [matchId]: "" }));
  }

  function removeScorer(matchId: string, idx: number) {
    setScorerMap((prev) => {
      const updated = [...(prev[matchId] ?? [])];
      updated.splice(idx, 1);
      return { ...prev, [matchId]: updated };
    });
  }

  async function save(matchId: string) {
    setLoadingId(matchId);
    setResultMap((prev) => ({ ...prev, [matchId]: { ok: false, msg: "" } }));
    try {
      const res = await fetch("/api/admin/scorers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, scorerIds: scorerMap[matchId] ?? [] }),
      });
      const data = await res.json();
      if (data.success) {
        setResultMap((prev) => ({
          ...prev,
          [matchId]: { ok: true, msg: `✅ ${data.scorersAdded} buteur(s) · ${data.bonusUpdated} bonus recalculé(s)` },
        }));
      } else {
        setResultMap((prev) => ({
          ...prev,
          [matchId]: { ok: false, msg: `Erreur: ${data.error ?? "inconnue"}` },
        }));
      }
    } catch {
      setResultMap((prev) => ({
        ...prev,
        [matchId]: { ok: false, msg: "Erreur réseau" },
      }));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const search = searchMap[match.id] ?? "";
        const scorerIds = scorerMap[match.id] ?? [];
        const isExpanded = expandedId === match.id;
        const result = resultMap[match.id];

        // Filtrer les joueurs par recherche (priorité aux équipes du match)
        const filtered = search.length >= 2
          ? players.filter((p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.team_name.toLowerCase().includes(search.toLowerCase())
            ).sort((a, b) => {
              const aTeam = a.team_name.toLowerCase().includes(match.home_team.toLowerCase()) ||
                            a.team_name.toLowerCase().includes(match.away_team.toLowerCase());
              const bTeam = b.team_name.toLowerCase().includes(match.home_team.toLowerCase()) ||
                            b.team_name.toLowerCase().includes(match.away_team.toLowerCase());
              return (bTeam ? 1 : 0) - (aTeam ? 1 : 0);
            }).slice(0, 8)
          : [];

        return (
          <div key={match.id} className="card overflow-hidden">
            {/* Header du match */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : match.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-semibold text-dark text-sm">
                  {match.home_flag} {match.home_team} vs {match.away_flag} {match.away_team}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-primary text-sm">
                    {match.home_score} – {match.away_score}
                  </span>
                  {scorerIds.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                      {scorerIds.length} buteur{scorerIds.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {scorerIds.length === 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                      Aucun buteur
                    </span>
                  )}
                </div>
              </div>
              <span className="text-gray-400 text-sm">{isExpanded ? "▲" : "▼"}</span>
            </button>

            {/* Formulaire dépliable */}
            {isExpanded && (
              <div className="border-t border-border px-4 py-4 space-y-3">
                {/* Buteurs actuels */}
                <div>
                  <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-2">Buteurs</p>
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {scorerIds.length === 0 && (
                      <span className="text-xs text-muted italic">Aucun buteur enregistré</span>
                    )}
                    {scorerIds.map((pid, idx) => {
                      const player = playerById[pid];
                      return (
                        <span
                          key={`${pid}-${idx}`}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ background: "rgba(0,61,165,0.1)", color: "#003DA5", border: "1px solid rgba(0,61,165,0.2)" }}
                        >
                          {player?.name ?? pid}
                          <button
                            onClick={() => removeScorer(match.id, idx)}
                            className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors font-bold leading-none"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Recherche joueur */}
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearchMap((prev) => ({ ...prev, [match.id]: e.target.value }))}
                    placeholder="Rechercher un joueur (min. 2 lettres)…"
                    className="input w-full text-sm"
                  />
                  {filtered.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
                      {filtered.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => addScorer(match.id, p.id)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                        >
                          <span className="text-sm font-medium text-dark">{p.name}</span>
                          <span className="text-[10px] text-muted ml-2 truncate max-w-[100px]">{p.team_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bouton sauvegarder */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => save(match.id)}
                    disabled={loadingId === match.id}
                    className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
                  >
                    {loadingId === match.id ? "Sauvegarde…" : "Sauvegarder les buteurs"}
                  </button>
                  {result?.msg && (
                    <p className={`text-xs font-medium ${result.ok ? "text-green-600" : "text-red-500"}`}>
                      {result.msg}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
