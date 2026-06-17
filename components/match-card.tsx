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

function Flag({ team }: { team: string }) {
  const url = getFlagUrl(team, "md");
  return (
    <div className="w-12 h-9 rounded-md overflow-hidden shadow-sm bg-gray-100 shrink-0 border border-gray-200">
      {url ? (
        <img src={url} alt={team} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">?</div>
      )}
    </div>
  );
}

export function MatchCard({ match, leagueId, locked, showScore, predicted, href }: MatchCardProps) {
  const finished = match.status === "finished";

  const content = (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:border-[#00A650]/30 transition-all">

      {/* Bandeau WC2026 style */}
      <div className="wc-header px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#00A650] uppercase tracking-widest">{match.stage}</span>
        <span className="text-[10px] text-gray-400">{formatDate(match.kickoff_at)}</span>
      </div>

      {/* Corps du match */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">

          {/* Équipe domicile */}
          <div className="flex-1 flex flex-col items-end gap-1.5">
            <Flag team={match.home_team} />
            <span className="font-bold text-[#0D1B2E] text-xs text-right leading-tight">{match.home_team}</span>
          </div>

          {/* Score / VS */}
          <div className="shrink-0 text-center min-w-[64px]">
            {finished && match.home_score != null ? (
              <div className="bg-[#0D1B2E] rounded-lg px-3 py-1.5">
                <span className="font-mono font-bold text-white text-xl tracking-widest">
                  {match.home_score} – {match.away_score}
                </span>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-lg px-3 py-1.5">
                <span className="font-bold text-gray-300 text-base">VS</span>
              </div>
            )}
          </div>

          {/* Équipe extérieure */}
          <div className="flex-1 flex flex-col items-start gap-1.5">
            <Flag team={match.away_team} />
            <span className="font-bold text-[#0D1B2E] text-xs leading-tight">{match.away_team}</span>
          </div>
        </div>

        {/* Badge action */}
        {leagueId && (
          <div className="mt-3 text-center">
            {finished ? (
              <span className="text-xs text-gray-400 font-medium">Voir les pronostics →</span>
            ) : locked ? (
              <span className="text-xs text-gray-400 font-medium">🔒 Verrouillé</span>
            ) : predicted ? (
              <span className="text-xs font-bold text-[#00A650] bg-green-50 px-3 py-1 rounded-full border border-[#00A650]/20">
                ✓ Pronostic enregistré →
              </span>
            ) : (
              <span className="text-xs font-bold text-white bg-[#00A650] px-3 py-1 rounded-full">
                Pronostiquer →
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block">{content}</Link>;
  return content;
}
