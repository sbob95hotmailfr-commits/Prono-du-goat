"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminRecalculateBtn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Calcul en cours…" : "🔄 Recalculer tous les points"}
      </button>
      {result && <p className="text-sm font-semibold">{result}</p>}
    </div>
  );
}
