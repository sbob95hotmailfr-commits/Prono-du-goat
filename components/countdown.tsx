"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  nextMatchAt: string | null; // ISO string UTC
  matchLabel?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function Countdown({ nextMatchAt, matchLabel }: CountdownProps) {
  const [remaining, setRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!nextMatchAt) return;

    function tick() {
      const diff = new Date(nextMatchAt!).getTime() - Date.now();
      if (diff <= 0) {
        setOver(true);
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      setRemaining({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextMatchAt]);

  if (!nextMatchAt) {
    return (
      <div className="bg-[#0D1B2E] rounded-xl px-5 py-4 text-center">
        <p className="text-[#F5A623] font-bold text-lg">Tournoi terminé 🏆</p>
      </div>
    );
  }

  if (over || !remaining) {
    return (
      <div className="bg-[#0D1B2E] rounded-xl px-5 py-4 text-center">
        <span className="flex items-center justify-center gap-1.5 text-[#E8192C] font-bold text-sm">
          <span className="w-2 h-2 bg-[#E8192C] rounded-full animate-pulse inline-block"></span>
          En cours
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[#0D1B2E] rounded-xl px-4 py-3">
      {matchLabel && (
        <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center mb-2 truncate">
          Prochain : {matchLabel}
        </p>
      )}
      <div className="flex items-end justify-center gap-2">
        {[
          { value: remaining.days,    label: "J" },
          { value: remaining.hours,   label: "H" },
          { value: remaining.minutes, label: "MIN" },
          { value: remaining.seconds, label: "SEC" },
        ].map(({ value, label }, i, arr) => (
          <div key={label} className="flex items-end gap-2">
            <div className="text-center">
              <span className="font-mono font-bold text-[#F5A623] text-2xl leading-none block">
                {pad(value)}
              </span>
              <span className="text-[9px] text-gray-500 uppercase tracking-widest">{label}</span>
            </div>
            {i < arr.length - 1 && (
              <span className="text-[#F5A623] font-bold text-xl leading-none mb-1">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
