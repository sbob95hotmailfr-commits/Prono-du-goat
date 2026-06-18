"use client";

import Link from "next/link";
import { getFlagUrl } from "@/lib/flags";
import { formatDate } from "@/lib/utils";

interface MatchCardProps {
  match: any;
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
    <div className={`${cls} rounded overflow-hidden bg-gray-100 border border-gray-200 shrink-0`}>
      {url
        ? <img src={url} alt={team} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400">?</div>
      }
    </div>
  );
}

export function MatchCard({ match, leagueId, locked, showScore, predicted, href }: MatchCardProps) {
  const finished = match.status === "finished";
  const live = match.status === "live";
  const showResult = (finished && showScore && match.home_score != null) || live;

  const content = (
    <div className="bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 px-4 py-3">

      {/* Badge statut */}
      <div className="flex justify-center mb-2">
        {live && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#E8192C]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8192C] animate-pulse inline-block"></span>
            EN DIRECT
          </span>
        )}
        {finished && (
          <span className="text-[11px] font-bold text-[#00A650] uppercase tracking-wide">Terminé</span>
        )}
        {!finished && !live && (
          <span className="text-[11px] text-gray-400">{formatDate(match.kickoff_at)}</span>
        )}
      </div>

      {/* Équipes + score */}
      <div className="flex items-center gap-3">
        {/* Équipe domicile */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className="font-semibold text-sm text-[#1A1A1A] text-right leading-tight">{match.home_team}</span>
          <Flag team={match.home_team} size="md" />
        </div>

        {/* Score */}
        <div className="shrink-0 min-w-[70px] text-center">
          {showResult ? (
            <span className="font-bold text-xl text-[#1A1A1A] tracking-wide">
              {match.home_score} – {match.away_score}
            </span>
          ) : (
            <span className="font-bold text-xl text-gray-300">–</span>
          )}
        </div>

        {/* Équipe extérieure */}
        <div className="flex-1 flex items-center gap-2">
          <Flag team={match.away_team} size="md" />
          <span className="font-semibold text-sm text-[#1A1A1A] leading-tight">{match.away_team}</span>
        </div>
      </div>

      {/* Groupe + action */}
      <div className="flex items-center justify-center gap-3 mt-2">
        <span className="text-[11px] text-gray-400">{match.stage}</span>

        {leagueId && (
          <>
            <span className="text-gray-300 text-[10px]">·</span>
            {finished ? (
              <span className="text-[11px] text-gray-500">Voir les pronostics →</span>
            ) : locked ? (
              <span className="text-[11px] text-gray-400">🔒 Verrouillé</span>
            ) : predicted ? (
              <span className="text-[11px] font-bold text-[#00A650]">✓ Pronostiqué</span>
            ) : (
              <span className="text-[11px] font-bold text-[#003DA5]">Pronostiquer →</span>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block">{content}</Link>;
  return content;
}
