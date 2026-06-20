"use client";

import Link from "next/link";
import Image from "next/image";
import { getFlagUrl } from "@/lib/flags";
import { formatDate } from "@/lib/utils";
import { ReactionsBar } from "@/components/reactions-bar";

interface MatchCardProps {
  match: {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number | null;
    away_score: number | null;
    kickoff_at: string;
    stage: string;
    status: "upcoming" | "live" | "finished";
    minute?: number | null;
  };
  leagueId?: string;
  locked?: boolean;
  showScore?: boolean;
  predicted?: boolean;
  href?: string;
}

function Flag({ team, size = "sm" }: { team: string; size?: "sm" | "md" }) {
  const url = getFlagUrl(team, "md");
  const cls = size === "md" ? "w-10 h-7" : "w-8 h-6";
  return (
    <div className={`${cls} rounded overflow-hidden shrink-0`} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
      {url
        ? <img src={url} alt={team} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400">?</div>
      }
    </div>
  );
}

function BallAction({ href, predicted }: { href: string; predicted: boolean }) {
  return (
    <Link
      href={href}
      title={predicted ? "Voir mon pronostic" : "Faire mon pronostic"}
      className="flex flex-col items-center gap-1 shrink-0"
    >
      <div
        className={predicted ? "ball-frozen" : "ball-beat"}
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          overflow: "hidden",
          border: `2px solid ${predicted ? "#00A650" : "#F5A623"}`,
          boxShadow: predicted
            ? "0 0 8px rgba(0,166,80,0.4)"
            : "0 0 10px rgba(245,166,35,0.5)",
        }}
      >
        <Image
          src="/ball.png"
          alt="Pronostiquer"
          width={42}
          height={42}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      </div>
      <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: predicted ? "#00A650" : "#F5A623" }}>
        {predicted ? "✓ Fait" : "Prono"}
      </span>
    </Link>
  );
}

export function MatchCard({ match, leagueId, locked, showScore, predicted, href }: MatchCardProps) {
  const finished = match.status === "finished";
  const live = match.status === "live";
  const showResult = (finished && showScore && match.home_score != null) || live;
  const showBall = leagueId && href && !finished && !locked;

  const content = (
    <div className="transition-colors border-b border-white/[0.06] last:border-0" style={{ background: "#1E2D42" }}>
      <div className="px-4 py-3">

        {/* Badge statut */}
        <div className="flex justify-center mb-2">
          {live && (
            <span className="flex items-center gap-1.5 bg-[#E8192C] text-white text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full shrink-0" />
              EN DIRECT {match.minute ? `${match.minute}'` : ""}
            </span>
          )}
          {finished && (
            <span className="text-[11px] font-bold text-[#00A650] uppercase tracking-wide">Terminé</span>
          )}
          {!finished && !live && (
            <span className="text-[11px] text-gray-500">{formatDate(match.kickoff_at)}</span>
          )}
        </div>

        {/* Équipes + score + ballon */}
        <div className="flex items-center gap-2">
          {/* Domicile */}
          <div className="flex-1 flex items-center justify-end gap-2">
            <span className="font-semibold text-sm text-white text-right leading-tight">{match.home_team}</span>
            <Flag team={match.home_team} size="md" />
          </div>

          {/* Score ou tiret */}
          <div className="shrink-0 min-w-[60px] text-center">
            {showResult ? (
              <span className="font-bold text-xl text-white tracking-wide">
                {match.home_score} – {match.away_score}
              </span>
            ) : (
              <span className="font-bold text-xl text-white/20">–</span>
            )}
          </div>

          {/* Extérieur */}
          <div className="flex-1 flex items-center gap-2">
            <Flag team={match.away_team} size="md" />
            <span className="font-semibold text-sm text-white leading-tight">{match.away_team}</span>
          </div>

          {/* Ballon pronostic */}
          {showBall && (
            <div className="ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <BallAction href={href!} predicted={!!predicted} />
            </div>
          )}
        </div>

        {/* Groupe + statut texte */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-[11px] text-gray-500">{match.stage}</span>
          {leagueId && (finished || locked) && (
            <>
              <span className="text-white/10 text-[10px]">·</span>
              {finished ? (
                <span className="text-[11px] text-gray-500">Voir les pronostics →</span>
              ) : (
                <span className="text-[11px] text-gray-500">🔒 Verrouillé</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (href) return (
    <div>
      <Link href={href} className="block">{content}</Link>
      <ReactionsBar matchId={match.id} />
    </div>
  );
  return (
    <div>
      {content}
      <ReactionsBar matchId={match.id} />
    </div>
  );
}
