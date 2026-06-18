"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSyncBtn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<string[]>([]);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync-scores", { method: "POST" });
      const data = await res.json();
      setResult(data.message ?? (data.error || "Erreur inconnue"));
      setNotFound(data.notFound ?? []);
      if (data.updated > 0) setTimeout(() => router.refresh(), 500);
    } catch {
      setResult("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 bg-[#003DA5] hover:bg-[#003DA5]/90 disabled:opacity-50
                   text-white font-bold px-4 py-2.5 rounded-lg transition-all text-sm"
      >
        {loading ? (
          <>
            <span className="animate-spin">⟳</span>
            Synchronisation...
          </>
        ) : (
          <>
            ⚡ Sync scores API Football
          </>
        )}
      </button>
      {result && (
        <span className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
          result.includes("erreur") || result.includes("Erreur")
            ? "bg-red-50 text-red-600"
            : "bg-green-50 text-[#00A650]"
        }`}>
          {result}
        </span>
      )}
      {notFound.length > 0 && (
        <div className="w-full mt-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs font-bold text-orange-700 mb-1">Non trouvés sur API Football — saisir manuellement :</p>
          <ul className="text-xs text-orange-600 space-y-0.5">
            {notFound.map((m, i) => <li key={i}>• {m}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
