"use client";

import { useState } from "react";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <code className="flex-1 bg-gray-100 text-xs text-gray-800 px-2 py-1.5 rounded truncate font-mono">
        {value}
      </code>
      <button
        onClick={copy}
        className="shrink-0 text-xs px-2 py-1.5 rounded bg-[#003DA5] text-white font-bold hover:bg-[#003DA5]/80 transition-colors"
      >
        {copied ? "✓" : "Copier"}
      </button>
    </div>
  );
}

export function CronConfigCard({ cronSecret }: { cronSecret: string }) {
  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 mb-6">
      <h3 className="font-bold text-[#003DA5] text-sm mb-1">⚡ Synchronisation automatique via cron-job.org</h3>
      <p className="text-xs text-gray-500 mb-3">
        Configure un cron gratuit sur <strong>cron-job.org</strong> toutes les 5 min pour mettre à jour les scores automatiquement.
      </p>
      <div className="space-y-2">
        <CopyRow
          label="URL"
          value="https://prono-du-goat.vercel.app/api/cron/sync-live-scores"
        />
        <CopyRow label="Header" value="x-cron-secret" />
        <CopyRow label="Valeur" value={cronSecret} />
      </div>
      <p className="text-[11px] text-gray-400 mt-3">
        Méthode : <strong>GET</strong> · Schedule : <strong>*/5 * * * *</strong>
      </p>
    </div>
  );
}
