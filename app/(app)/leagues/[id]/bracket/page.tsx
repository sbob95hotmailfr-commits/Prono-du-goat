/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { WcNav } from "@/components/wc-nav";
import { getFlagUrl } from "@/lib/flags";

// Structure officielle du tableau final WC2026
// 48 équipes → 32 équipes (12 groupes → 8 groupes de 3e place passent)
// Seizièmes × 16 → Huitièmes × 8 → Quarts × 4 → Demis × 2 → Finale

const ROUNDS = [
  { key: "r32",  label: "Seizièmes de finale", short: "1/16" },
  { key: "r16",  label: "Huitièmes de finale",  short: "1/8"  },
  { key: "qf",   label: "Quarts de finale",     short: "1/4"  },
  { key: "sf",   label: "Demi-finales",          short: "1/2"  },
  { key: "final",label: "Finale",               short: "Final"},
];

// Matchs officiels WC2026 éliminatoires (stages dans la DB)
const KNOCKOUT_STAGES = [
  "Seizièmes de finale",
  "Huitièmes de finale",
  "Quarts de finale",
  "Demi-finales",
  "Finale",
  "Match pour la 3e place",
];

function isKnockout(stage: string) {
  return KNOCKOUT_STAGES.some(s => stage?.includes(s) || s.includes(stage));
}

function Flag({ team }: { team: string }) {
  const url = getFlagUrl(team, "sm");
  return (
    <div className="w-6 h-4 rounded overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
      {url
        ? <img src={url} alt={team} className="w-full h-full object-cover" />
        : <span className="w-full h-full flex items-center justify-center text-[6px] text-gray-300">?</span>
      }
    </div>
  );
}

function BracketMatch({ match, idx }: { match?: any; idx: number }) {
  const finished = match?.status === "finished";
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm min-w-[160px] w-[160px]">
      <div className="bg-gray-50 border-b border-gray-100 px-2 py-1">
        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">M°{(match?.match_num ?? idx + 73)}</span>
      </div>

      {/* Équipe domicile */}
      <div className={`flex items-center gap-2 px-2 py-1.5 border-b border-gray-50 ${
        finished && match.home_score > match.away_score ? "bg-green-50" : ""
      }`}>
        {match?.home_team && match.home_team !== "À déterminer" ? (
          <>
            <Flag team={match.home_team} />
            <span className="text-[11px] font-semibold text-[#1A1A1A] flex-1 truncate">{match.home_team}</span>
            {finished && <span className="text-xs font-bold text-[#1A1A1A] shrink-0">{match.home_score}</span>}
          </>
        ) : (
          <span className="text-[10px] text-gray-300 italic">{match?.home_team ?? "À déterminer"}</span>
        )}
      </div>

      {/* Équipe extérieure */}
      <div className={`flex items-center gap-2 px-2 py-1.5 ${
        finished && match.away_score > match.home_score ? "bg-green-50" : ""
      }`}>
        {match?.away_team && match.away_team !== "À déterminer" ? (
          <>
            <Flag team={match.away_team} />
            <span className="text-[11px] font-semibold text-[#1A1A1A] flex-1 truncate">{match.away_team}</span>
            {finished && <span className="text-xs font-bold text-[#1A1A1A] shrink-0">{match.away_score}</span>}
          </>
        ) : (
          <span className="text-[10px] text-gray-300 italic">{match?.away_team ?? "À déterminer"}</span>
        )}
      </div>
    </div>
  );
}

export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("league_members").select("*")
    .eq("league_id", id).eq("user_id", user.id).single() as any;
  if (!membership) notFound();

  const { data: league } = await supabase
    .from("leagues").select("*").eq("id", id).single() as any;
  if (!league) notFound();

  const { data: matchesRaw } = await supabase
    .from("matches").select("*")
    .order("kickoff_at", { ascending: true }) as any;

  const isAdmin = (league as any).admin_id === user.id;
  const allMatches = (matchesRaw ?? []) as any[];

  // Filtrer matchs à élimination directe
  const knockoutMatches = allMatches.filter((m: any) => isKnockout(m.stage ?? ""));

  // Grouper par phase
  const byStage: Record<string, any[]> = {
    "Seizièmes de finale": [],
    "Huitièmes de finale": [],
    "Quarts de finale": [],
    "Demi-finales": [],
    "Finale": [],
  };

  for (const m of knockoutMatches) {
    for (const stageName of Object.keys(byStage)) {
      if ((m.stage ?? "").includes(stageName) || stageName.includes(m.stage ?? "")) {
        byStage[stageName].push(m);
        break;
      }
    }
  }

  const hasKnockout = knockoutMatches.length > 0;

  // Dates officielles phases (UTC)
  const officialDates: Record<string, string> = {
    "Seizièmes de finale": "Du 28 juin au 4 juillet 2026",
    "Huitièmes de finale": "Du 4 au 7 juillet 2026",
    "Quarts de finale": "Du 9 au 12 juillet 2026",
    "Demi-finales": "14 & 15 juillet 2026",
    "Finale": "19 juillet 2026 — MetLife Stadium",
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <WcNav
        leagueId={id}
        leagueName={(league as any).name}
        code={(league as any).code}
        isAdmin={isAdmin}
        activeTab="tableau"
      />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Tableau final</h2>
        <p className="text-sm text-gray-400 mb-6">Phase à élimination directe · Coupe du Monde de la FIFA 2026™</p>

        {!hasKnockout ? (
          /* Phase de groupes encore en cours */
          <div className="space-y-4">
            {ROUNDS.map(round => (
              <div key={round.key} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-black px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-sm">{round.label}</p>
                    <p className="text-[11px] text-gray-400">{officialDates[round.label] ?? ""}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                    {round.short}
                  </span>
                </div>

                <div className="p-4 overflow-x-auto">
                  <div className="flex gap-3 min-w-max">
                    {/* Nombre de matchs par phase */}
                    {Array.from({ length:
                      round.key === "r32" ? 16 :
                      round.key === "r16" ? 8 :
                      round.key === "qf" ? 4 :
                      round.key === "sf" ? 2 : 1
                    }).map((_, i) => (
                      <div key={i} className="bg-gray-50 border border-dashed border-gray-200 rounded-lg min-w-[160px] w-[160px] overflow-hidden">
                        <div className="bg-gray-100 px-2 py-1 border-b border-gray-200">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">
                            M°{73 + (
                              round.key === "r32" ? i :
                              round.key === "r16" ? 16 + i :
                              round.key === "qf" ? 24 + i :
                              round.key === "sf" ? 28 + i :
                              30
                            )}
                          </span>
                        </div>
                        <div className="px-2 py-1.5 border-b border-gray-100">
                          <span className="text-[10px] text-gray-300 italic">À déterminer</span>
                        </div>
                        <div className="px-2 py-1.5">
                          <span className="text-[10px] text-gray-300 italic">À déterminer</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Info phase de groupes */}
            <div className="bg-[#003DA5]/10 border border-[#003DA5]/20 rounded-xl p-4 text-center">
              <p className="text-[#003DA5] font-bold text-sm mb-1">Phase de groupes en cours</p>
              <p className="text-[#003DA5]/70 text-xs">Le tableau se remplira à la fin de la phase de groupes (26 juin 2026)</p>
            </div>
          </div>
        ) : (
          /* Tableau avec vrais matchs */
          <div className="space-y-4">
            {ROUNDS.map(round => {
              const stageName = round.key === "r32" ? "Seizièmes de finale" :
                               round.key === "r16" ? "Huitièmes de finale" :
                               round.key === "qf" ? "Quarts de finale" :
                               round.key === "sf" ? "Demi-finales" : "Finale";
              const stageMatches = byStage[stageName] ?? [];

              return (
                <div key={round.key} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-black px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{stageName}</p>
                      <p className="text-[11px] text-gray-400">{officialDates[stageName] ?? ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{stageMatches.length}</span>
                      <span className="text-[10px] text-gray-500">match{stageMatches.length > 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <div className="p-4 overflow-x-auto">
                    <div className="flex gap-3 flex-wrap min-w-max">
                      {stageMatches.length > 0 ? (
                        stageMatches.map((m: any, i: number) => (
                          <BracketMatch key={m.id} match={m} idx={i} />
                        ))
                      ) : (
                        <p className="text-sm text-gray-300 italic py-2">À venir</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
