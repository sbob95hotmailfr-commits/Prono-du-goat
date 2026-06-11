"use client";

import { useEffect, useState } from "react";

const KICKOFF = new Date("2026-06-11T20:00:00Z"); // 11 juin 2026 à 15h00 EST

export function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    function update() {
      const diff = KICKOFF.getTime() - Date.now();
      if (diff <= 0) {
        setStarted(true);
        return;
      }
      setTimeLeft({
        days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (started) {
    return (
      <p className="text-primary font-bold text-sm mt-6 animate-pulse">
        ⚽ Le tournoi a commencé !
      </p>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-gray-500 text-xs mb-3 uppercase tracking-widest">
        Coup d&apos;envoi dans
      </p>
      <div className="flex items-center justify-center gap-3">
        {[
          { value: timeLeft.days,    label: "jours" },
          { value: timeLeft.hours,   label: "heures" },
          { value: timeLeft.minutes, label: "min" },
          { value: timeLeft.seconds, label: "sec" },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className="bg-white/10 rounded-lg px-3 py-2 min-w-[56px]">
              <span className="font-mono font-bold text-2xl text-white">
                {String(item.value).padStart(2, "0")}
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
