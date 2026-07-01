"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminRecalculateBtn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingScorers, setLoadingScorers] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [syncDetail, setSyncDetail] = useState<any>(null);

  async function handleClick() {
    if (!confirm("Recalculer les points pour TOUS les matchs terminés ?")) return;
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/admin/recalculate", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setResult("❌ Erreur : " + (data.error ?? res.status));
    } else {
      setResult(`✅ ${data.matchesProcessed} matchs traités — ${data.predictionsUpdated} pronostics mis à jour`);
      setTimeout(() => router.refresh(), 800);
    }
    setLoading(false);
  }

  async function handleSyncScorers() {
    if (!confirm("Récupérer les buteurs réels depuis l'API et recalculer les bonus buteurs pour tous les matchs terminés ?")) return;
    setLoadingScorers(true);
    setResult(null);

    const res = await fetch("/api/admin/sync-scorer-bonuses", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setResult("❌ Erreur : " + (data.error ?? res.status));
    } else {
      let msg = `⚽ ${data.matches_processed} matchs traités — ${data.predictions_updated ?? data.bonuses_updated} pronos mis à jour`;
      if (data.skipped_count > 0) msg += ` | ⚠️ ${data.skipped_count} matchs non trouvés dans l'API`;
      if (data.unmapped_scorers_count > 0) msg += ` | ⚠️ ${data.unmapped_scorers_count} buteurs non mappés`;
      setResult(msg);
      setSyncDetail(data);
      setTimeout(() => router.refresh(), 800);
    }
    setLoadingScorers(false);
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        onClick={handleClick}
        disabled={loading || loadingScorers}
        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Calcul en cours…" : "🔄 Recalculer tous les points"}
      </button>
      <button
        onClick={handleSyncScorers}
        disabled={loading || loadingScorers}
        className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
      >
        {loadingScorers ? "Sync en cours…" : "⚽ Sync buteurs réels + bonus"}
      </button>
      {result && <p className="text-sm font-semibold">{result}</p>}
      {syncDetail?.skipped?.length > 0 && (
        <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2 mt-1 w-full">
          <p className="font-bold mb-1">Matchs non trouvés dans l'API :</p>
          {syncDetail.skipped.map((s: string, i: number) => <p key={i}>• {s}</p>)}
        </div>
      )}
      {syncDetail?.unmapped_scorers?.length > 0 && (
        <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 mt-1 w-full">
          <p className="font-bold mb-1">Buteurs non mappés (pas dans la base joueurs) :</p>
          {syncDetail.unmapped_scorers.slice(0, 10).map((s: string, i: number) => <p key={i}>• {s}</p>)}
          {syncDetail.unmapped_scorers.length > 10 && <p>…et {syncDetail.unmapped_scorers.length - 10} autres</p>}
        </div>
      )}
    </div>
  );
}
