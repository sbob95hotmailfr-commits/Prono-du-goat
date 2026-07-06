"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BackButton } from "@/components/back-button";

export default function PronosticFinalPage() {
  const { id: leagueId } = useParams<{ id: string }>();

  const [qfTeams, setQfTeams] = useState<string[]>([]);
  const [semis, setSemis] = useState<string[]>([]);
  const [winner, setWinner] = useState("");
  const [existing, setExisting] = useState<any>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const r1 = await fetch(`/api/leagues/${leagueId}/qf-teams`);
        const d1 = await r1.json();
        setQfTeams(d1.teams ?? []);
        setLocked(d1.locked ?? false);

        const r2 = await fetch(`/api/leagues/${leagueId}/tournament-prediction`);
        const d2 = await r2.json();
        if (d2.prediction) {
          setExisting(d2.prediction);
          setSemis([d2.prediction.semi1, d2.prediction.semi2, d2.prediction.semi3, d2.prediction.semi4]);
          setWinner(d2.prediction.winner);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [leagueId]);

  function toggleSemi(team: string) {
    if (locked || existing) return;
    setSemis((prev) => {
      if (prev.includes(team)) return prev.filter((t) => t !== team);
      if (prev.length >= 4) return prev;
      return [...prev, team];
    });
    // Si on déselectionne l'équipe choisie comme vainqueur, reset
    if (winner === team) setWinner("");
  }

  async function handleSubmit() {
    if (semis.length !== 4 || !winner) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/leagues/${leagueId}/tournament-prediction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semi1: semis[0], semi2: semis[1], semi3: semis[2], semi4: semis[3], winner,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur"); setSaving(false); return; }
      setSaved(true);
      setExisting({ semi1: semis[0], semi2: semis[1], semi3: semis[2], semi4: semis[3], winner, points_earned: 0 });
    } catch { setError("Erreur réseau"); }
    setSaving(false);
  }

  const step = semis.length < 4 ? 1 : !winner ? 2 : 3;
  const canSubmit = semis.length === 4 && !!winner && !existing && !locked;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1525" }}>
        <p className="text-gray-400">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0D1525" }}>
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-2">
          <BackButton fallback={`/leagues/${leagueId}`} className="text-xs text-gray-500 hover:text-gray-300" />
        </div>
        <div className="text-center mb-6">
          <span className="text-4xl">🔮</span>
          <h1 className="text-2xl font-black text-white mt-2 mb-1">Pronostic Spécial</h1>
          <p className="text-gray-400 text-sm">Bonus Phase Finale — jusqu&apos;aux quarts de finale</p>
        </div>

        {/* Récap points */}
        <div className="rounded-xl p-4 mb-6 border border-white/5" style={{ background: "#111927" }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ce que tu peux gagner</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">✦ Demi-finaliste correct</span>
              <span className="font-bold" style={{ color: "#F5A623" }}>+3 pts chacun</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">✦ Les 2 finalistes corrects</span>
              <span className="font-bold" style={{ color: "#F5A623" }}>+5 pts bonus</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">✦ Vainqueur correct</span>
              <span className="font-bold" style={{ color: "#E8192C" }}>+10 pts</span>
            </div>
            <div className="border-t border-white/5 pt-2 mt-1 flex items-center justify-between text-sm">
              <span className="text-gray-400">Maximum possible</span>
              <span className="font-black text-white">+27 pts</span>
            </div>
          </div>
        </div>

        {/* Clôturé */}
        {locked && !existing && (
          <div className="rounded-xl px-4 py-3 mb-5 text-center border border-yellow-500/20 text-yellow-400 text-sm" style={{ background: "#1a1200" }}>
            Les quarts de finale ont commencé. Les pronostics sont clôturés.
          </div>
        )}

        {/* Confirmé */}
        {saved && (
          <div className="rounded-xl px-4 py-3 mb-5 text-center border border-green-500/20 text-green-400 text-sm" style={{ background: "#001a00" }}>
            ✓ Pronostic enregistré !
          </div>
        )}

        {/* Pronostic existant */}
        {existing && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 border border-white/5" style={{ background: "#111927" }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tes 4 demi-finalistes</p>
              <div className="grid grid-cols-2 gap-2">
                {[existing.semi1, existing.semi2, existing.semi3, existing.semi4].map((t: string, i: number) => (
                  <div key={i}
                    className="rounded-xl px-3 py-2.5 text-sm font-bold border"
                    style={{
                      background: t === existing.winner ? "#1a0f00" : "#0D1525",
                      borderColor: t === existing.winner ? "#F5A623" : "#ffffff15",
                      color: t === existing.winner ? "#F5A623" : "white",
                    }}>
                    {t === existing.winner ? "🏆 " : "✓ "}{t}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4 border" style={{ background: "#1a0f00", borderColor: "#F5A62340" }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ton vainqueur</p>
              <p className="font-black text-lg" style={{ color: "#F5A623" }}>🏆 {existing.winner}</p>
            </div>
            {existing.points_earned > 0 && (
              <div className="rounded-xl px-4 py-3 text-center border border-green-500/20 text-green-400 text-sm font-bold" style={{ background: "#001a00" }}>
                +{existing.points_earned} pts gagnés jusqu&apos;ici
              </div>
            )}
          </div>
        )}

        {/* Formulaire */}
        {!existing && !locked && (
          <div className="space-y-5">

            {/* Étape 1 */}
            <div className="rounded-xl overflow-hidden border" style={{
              borderColor: step === 1 ? "#F5A623" : "#ffffff10",
              background: "#111927",
            }}>
              <div className="px-4 py-3 flex items-center gap-3" style={{ background: step === 1 ? "rgba(245,166,35,0.08)" : "#0D1525" }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                  style={{ background: step === 1 ? "#F5A623" : semis.length === 4 ? "#00A650" : "#1f2937", color: step === 1 ? "#000" : "white" }}>
                  {semis.length === 4 ? "✓" : "1"}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Tes 4 demi-finalistes</p>
                  <p className="text-[11px] text-gray-400">
                    {semis.length < 4
                      ? `Sélectionne ${4 - semis.length} équipe${4 - semis.length > 1 ? "s" : ""} de plus`
                      : "Sélection complète"}
                  </p>
                </div>
                <span className="ml-auto text-sm font-bold" style={{ color: "#F5A623" }}>{semis.length}/4</span>
              </div>

              <div className="p-3">
                {qfTeams.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Les équipes seront disponibles une fois les huitièmes terminés.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {qfTeams.map((team) => {
                      const inSemis = semis.includes(team);
                      const full = semis.length >= 4 && !inSemis;
                      return (
                        <button key={team} onClick={() => toggleSemi(team)}
                          disabled={full}
                          className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-all border"
                          style={{
                            background: inSemis ? "#0f1a0f" : "#0D1525",
                            borderColor: inSemis ? "#00A650" : "#ffffff10",
                            color: inSemis ? "white" : full ? "#374151" : "#9CA3AF",
                            cursor: full ? "not-allowed" : "pointer",
                          }}>
                          {inSemis ? "✓ " : ""}{team}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Étape 2 — visible uniquement si 4 semis choisis */}
            <div className="rounded-xl overflow-hidden border" style={{
              borderColor: step === 2 ? "#F5A623" : step === 3 ? "#ffffff10" : "#ffffff05",
              background: semis.length < 4 ? "rgba(17,25,39,0.4)" : "#111927",
              opacity: semis.length < 4 ? 0.5 : 1,
              transition: "opacity 0.3s",
            }}>
              <div className="px-4 py-3 flex items-center gap-3" style={{ background: step === 2 ? "rgba(245,166,35,0.08)" : "#0D1525" }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                  style={{ background: step === 2 ? "#F5A623" : winner ? "#00A650" : "#1f2937", color: step === 2 ? "#000" : "white" }}>
                  {winner ? "✓" : "2"}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Ton vainqueur</p>
                  <p className="text-[11px] text-gray-400">
                    {semis.length < 4
                      ? "Complète d'abord tes demi-finalistes"
                      : winner
                      ? `Tu as choisi ${winner}`
                      : "Qui remporte la Coupe du Monde ?"}
                  </p>
                </div>
                {winner && <span className="ml-auto text-[11px] font-bold" style={{ color: "#00A650" }}>✓</span>}
              </div>

              {semis.length === 4 && (
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {semis.map((team) => (
                      <button key={team} onClick={() => setWinner(winner === team ? "" : team)}
                        className="rounded-lg px-3 py-3 text-sm font-bold transition-all border text-center"
                        style={{
                          background: winner === team ? "#1a0f00" : "#0D1525",
                          borderColor: winner === team ? "#F5A623" : "#ffffff10",
                          color: winner === team ? "#F5A623" : "white",
                        }}>
                        {winner === team ? "🏆 " : ""}{team}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button onClick={handleSubmit} disabled={!canSubmit || saving}
              className="w-full py-4 rounded-2xl font-black text-sm transition-all"
              style={{
                background: canSubmit ? "#F5A623" : "#1f2937",
                color: canSubmit ? "#000" : "#4B5563",
              }}>
              {saving ? "Enregistrement…" : canSubmit ? "Valider mon pronostic" : semis.length < 4 ? `Sélectionne encore ${4 - semis.length} équipe${4 - semis.length > 1 ? "s" : ""}` : "Choisis ton vainqueur"}
            </button>
            <p className="text-gray-600 text-[11px] text-center">Non modifiable après validation</p>

          </div>
        )}

      </div>
    </div>
  );
}
