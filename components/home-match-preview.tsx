"use client";

import { useEffect, useState } from "react";
import { getFlagUrl } from "@/lib/flags";

interface Props {
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  stage?: string;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

export function HomeMatchPreview({ homeTeam, awayTeam, kickoffAt, stage }: Props) {
  const kickoff = new Date(kickoffAt);
  const [diff, setDiff] = useState(kickoff.getTime() - Date.now());

  useEffect(() => {
    const t = setInterval(() => setDiff(kickoff.getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [kickoffAt]);

  const live = diff <= 0;
  const h = Math.max(0, Math.floor(diff / 3600000));
  const m = Math.max(0, Math.floor((diff % 3600000) / 60000));
  const s = Math.max(0, Math.floor((diff % 60000) / 1000));

  const kickoffLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(kickoff);

  const homeFlag = getFlagUrl(homeTeam);
  const awayFlag = getFlagUrl(awayTeam);

  return (
    <div className="mt-6 rounded-2xl overflow-hidden"
      style={{ background: "#0D1B2E", border: "1px solid rgba(255,255,255,0.08)" }}>

      {/* Label */}
      <div className="flex items-center justify-center gap-2 pt-4 pb-2">
        {live ? (
          <><span className="w-2 h-2 rounded-full bg-[#E8192C] animate-pulse" /><span className="text-[11px] font-bold text-[#E8192C] uppercase tracking-widest">En direct</span></>
        ) : (
          <><span className="w-2 h-2 rounded-full bg-[#F5A623] animate-pulse" /><span className="text-[11px] font-bold text-[#F5A623] uppercase tracking-widest">Prochain match</span></>
        )}
      </div>

      {/* Équipes */}
      <div className="flex items-center justify-center gap-5 px-6 pb-4">
        {/* Domicile */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {homeFlag
            ? <img src={homeFlag} alt={homeTeam} className="w-14 h-10 object-cover rounded-md shadow-lg border border-white/10" />
            : <span className="text-3xl">🏳️</span>}
          <span className="text-white font-bold text-xs text-center leading-tight">{homeTeam}</span>
        </div>

        {/* Séparateur */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="font-black text-xl" style={{ color: "#003DA5" }}>VS</span>
          {stage && <span className="text-[9px] text-gray-500 uppercase tracking-wide">{stage}</span>}
        </div>

        {/* Extérieur */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {awayFlag
            ? <img src={awayFlag} alt={awayTeam} className="w-14 h-10 object-cover rounded-md shadow-lg border border-white/10" />
            : <span className="text-3xl">🏳️</span>}
          <span className="text-white font-bold text-xs text-center leading-tight">{awayTeam}</span>
        </div>
      </div>

      {/* Compte à rebours */}
      <div className="border-t border-white/5 px-4 py-3 flex flex-col items-center gap-1">
        {live ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E8192C] animate-pulse" />
            <span className="font-bold text-sm" style={{ color: "#E8192C" }}>Match en cours</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {[{ val: pad(h), label: "H" }, { val: pad(m), label: "MIN" }, { val: pad(s), label: "SEC" }].map(({ val, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <div className="rounded-lg px-3 py-2 min-w-[52px] text-center"
                    style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(245,166,35,0.2)" }}>
                    <span className="font-mono text-2xl font-black" style={{ color: "#F5A623" }}>{val}</span>
                  </div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider mt-1">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">{kickoffLabel}</p>
          </>
        )}
      </div>
    </div>
  );
}
