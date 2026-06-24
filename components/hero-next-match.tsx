"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getFlagUrl } from "@/lib/flags";

interface Props {
  match: {
    id: string;
    home_team: string;
    away_team: string;
    kickoff_at: string;
    stage: string;
  };
  leagueId: string;
  predicted: boolean;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

export function HeroNextMatch({ match, leagueId, predicted }: Props) {
  const kickoff = new Date(match.kickoff_at);
  const [diff, setDiff] = useState(kickoff.getTime() - Date.now());

  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => {
      const newDiff = kickoff.getTime() - Date.now();
      setDiff(newDiff);
    }, 1000);
    return () => clearInterval(t);
  }, [match.kickoff_at]);

  // Refresh serveur au coup d'envoi (pour passer au prochain match)
  useEffect(() => {
    if (diff > 0 && diff < 2000) {
      router.refresh();
    }
  }, [diff]);

  // Refresh toutes les 60s pendant un match en cours (score live)
  useEffect(() => {
    if (diff > 0) return;
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [diff <= 0]);

  const locked = diff <= 0;
  const h = Math.max(0, Math.floor(diff / 3600000));
  const m = Math.max(0, Math.floor((diff % 3600000) / 60000));
  const s = Math.max(0, Math.floor((diff % 60000) / 1000));

  const kickoffLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(kickoff);

  const homeFlagUrl = getFlagUrl(match.home_team, "md");
  const awayFlagUrl = getFlagUrl(match.away_team, "md");

  return (
    <div
      className="relative overflow-hidden"
      style={{
        backgroundImage: "url('/hero-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center 30%",
        minHeight: "340px",
      }}
    >
      {/* Overlay sombre pour lisibilité du texte */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.65) 100%)" }} />

      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-10 text-white text-center">

        {/* Badge */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-[#F5A623] animate-pulse" />
          <span className="text-[11px] font-bold text-[#F5A623] uppercase tracking-widest">
            {predicted ? "Pronostic enregistré" : "Prochain match"}
          </span>
        </div>

        {/* Équipes */}
        <div className="flex items-center justify-center gap-6 md:gap-12 mb-6 w-full max-w-xl">
          {/* Domicile */}
          <div className="flex-1 flex flex-col items-center gap-3">
            {homeFlagUrl
              ? <img src={homeFlagUrl} alt={match.home_team} className="w-16 h-11 md:w-20 md:h-14 object-cover rounded-lg shadow-lg border border-white/10" />
              : <div className="w-20 h-14 rounded-lg bg-white/10 flex items-center justify-center text-2xl">🏳️</div>
            }
            <span className="font-bold text-sm md:text-base leading-tight">{match.home_team}</span>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-2xl md:text-3xl font-black text-white/30">VS</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{match.stage}</span>
          </div>

          {/* Extérieur */}
          <div className="flex-1 flex flex-col items-center gap-3">
            {awayFlagUrl
              ? <img src={awayFlagUrl} alt={match.away_team} className="w-16 h-11 md:w-20 md:h-14 object-cover rounded-lg shadow-lg border border-white/10" />
              : <div className="w-20 h-14 rounded-lg bg-white/10 flex items-center justify-center text-2xl">🏳️</div>
            }
            <span className="font-bold text-sm md:text-base leading-tight">{match.away_team}</span>
          </div>
        </div>

        {/* Clôture */}
        <p className="text-xs text-gray-400 mb-5">
          Clôture des pronos : <span className="text-white font-semibold">{kickoffLabel}</span>
        </p>

        {/* Compte à rebours */}
        {!locked ? (
          <div className="flex items-center gap-3 mb-7">
            {[{ val: pad(h), label: "Heures" }, { val: pad(m), label: "Minutes" }, { val: pad(s), label: "Secondes" }].map(({ val, label }) => (
              <div key={label} className="flex flex-col items-center">
                <div className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 min-w-[64px] text-center">
                  <span className="font-mono text-3xl font-black text-white">{val}</span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-7">
            <span className="bg-[#E8192C]/20 border border-[#E8192C]/40 text-[#E8192C] text-sm font-bold px-4 py-2 rounded-full">
              🔒 Pronos clôturés
            </span>
          </div>
        )}

        {/* CTA ballon */}
        {!locked && (
          <Link
            href={`/leagues/${leagueId}/match/${match.id}`}
            className="flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <div
              className={predicted ? "ball-frozen" : "ball-beat"}
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                overflow: "hidden",
                border: `3px solid ${predicted ? "#00A650" : "#F5A623"}`,
                boxShadow: predicted ? "0 0 24px rgba(0,166,80,0.5)" : "0 0 24px rgba(245,166,35,0.6)",
              }}
            >
              <Image
                src="/ball.png"
                alt="Pronostiquer"
                width={80}
                height={80}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            </div>
            <span className="text-sm font-black uppercase tracking-widest" style={{ color: predicted ? "#00A650" : "#F5A623" }}>
              {predicted ? "✓ Voir mon prono" : "Faire mon prono"}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
