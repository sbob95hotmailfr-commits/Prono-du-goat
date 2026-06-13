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

function RoundFlag({ team }: { team: string }) {
  const url = getFlagUrl(team, "md");
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm bg-gray-100 shrink-0">
      {url ? (
        <img src={url} alt={team} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">?</div>
      )}
    </div>
  );
}

export function MatchCard({ match, leagueId, locked, showScore, predicted, href }: MatchCardProps) {
  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all overflow-hidden">
      {/* Date + groupe */}
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 text-center">
        <p className="text-xs font-semibold text-gray-500">{formatDate(match.kickoff_at)}</p>
        <p className="text-xs text-gray-400">{match.stage}</p>
      </div>

      {/* Match */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Équipe domicile */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="font-bold text-gray-800 text-sm text-right">{match.home_team}</span>
            <RoundFlag team={match.home_team} />
          </div>

          {/* Score ou VS */}
          <div className="shrink-0 px-2 text-center min-w-[56px]">
            {showScore && match.home_score != null ? (
              <span className="font-mono font-bold text-xl text-gray-800">
                {match.home_score} - {match.away_score}
              </span>
            ) : (
              <span className="font-bold text-gray-300 text-base">-</span>
            )}
          </div>

          {/* Équipe extérieur */}
          <div className="flex items-center gap-2 flex-1">
            <RoundFlag team={match.away_team} />
            <span className="font-bold text-gray-800 text-sm">{match.away_team}</span>
          </div>
        </div>

        {/* Action */}
        {leagueId && (
          <div className="mt-3 text-center">
            {locked ? (
              <span className="text-xs text-gray-400">🔒 Verrouillé</span>
            ) : showScore ? (
              <span className="text-xs text-gray-400 font-semibold">Voir mon pronostic →</span>
            ) : predicted ? (
              <span className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full">
                ✓ Pronostic enregistré →
              </span>
            ) : (
              <span className="text-xs text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">
                Pronostiquer →
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}
