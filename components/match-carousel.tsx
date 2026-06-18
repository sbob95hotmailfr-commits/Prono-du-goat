"use client";

import Link from "next/link";
import { getFlagUrl } from "@/lib/flags";
import { formatDate } from "@/lib/utils";

interface CarouselMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: "upcoming" | "live" | "finished";
  kickoff_at: string;
  stage: string;
}

function MiniFlag({ team }: { team: string }) {
  const url = getFlagUrl(team, "sm");
  return (
    <div className="w-8 h-6 rounded overflow-hidden bg-gray-700 border border-gray-600 shrink-0">
      {url
        ? <img src={url} alt={team} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-[6px] text-gray-400">?</div>
      }
    </div>
  );
}

export function MatchCarousel({ matches, leagueId }: { matches: CarouselMatch[]; leagueId: string }) {
  if (!matches.length) return null;

  return (
    <div className="bg-[#0D1B2E] border-b border-[#1a2a40]">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {matches.map((m) => {
            const live = m.status === "live";
            const finished = m.status === "finished";
            return (
              <Link
                key={m.id}
                href={`/leagues/${leagueId}/match/${m.id}`}
                className={`flex-shrink-0 rounded-xl overflow-hidden border transition-all hover:scale-105 ${
                  live
                    ? "border-[#E8192C] bg-[#1a0a0a]"
                    : finished
                    ? "border-gray-600 bg-[#111]"
                    : "border-gray-700 bg-[#152030]"
                }`}
                style={{ minWidth: "140px", maxWidth: "140px" }}
              >
                <div className="px-2 pt-2 pb-1">
                  {/* Statut */}
                  <div className="flex justify-center mb-2">
                    {live && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-[#E8192C] uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E8192C] animate-pulse inline-block"></span>
                        En direct
                      </span>
                    )}
                    {finished && (
                      <span className="text-[9px] font-bold text-[#00A650] uppercase tracking-wide">FIN</span>
                    )}
                    {!live && !finished && (
                      <span className="text-[9px] text-gray-400">{formatDate(m.kickoff_at)}</span>
                    )}
                  </div>

                  {/* Équipe domicile */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <MiniFlag team={m.home_team} />
                    <span className="text-[10px] font-semibold text-white flex-1 truncate">{m.home_team}</span>
                    {(live || finished) && m.home_score !== null && (
                      <span className="text-[11px] font-bold text-white shrink-0">{m.home_score}</span>
                    )}
                  </div>

                  {/* Équipe extérieure */}
                  <div className="flex items-center gap-1.5">
                    <MiniFlag team={m.away_team} />
                    <span className="text-[10px] font-semibold text-white flex-1 truncate">{m.away_team}</span>
                    {(live || finished) && m.away_score !== null && (
                      <span className="text-[11px] font-bold text-white shrink-0">{m.away_score}</span>
                    )}
                  </div>
                </div>

                {/* Groupe */}
                <div className="px-2 py-1 border-t border-gray-700/50">
                  <span className="text-[9px] text-gray-500 truncate block">{m.stage}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
