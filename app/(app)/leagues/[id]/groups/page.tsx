/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { WcNav } from "@/components/wc-nav";
import { getFlagUrl } from "@/lib/flags";

type FormResult = "W" | "D" | "L";

interface TeamStat {
  name: string;
  group: string;
  J: number; G: number; N: number; P: number;
  Bp: number; Bc: number; Dif: number; Pts: number;
  form: FormResult[];
}

function computeStandings(matches: any[]): Record<string, TeamStat[]> {
  const teams: Record<string, TeamStat> = {};

  // Init toutes les équipes
  for (const m of matches) {
    if (!teams[m.home_team]) teams[m.home_team] = { name: m.home_team, group: m.stage, J:0, G:0, N:0, P:0, Bp:0, Bc:0, Dif:0, Pts:0, form:[] };
    if (!teams[m.away_team]) teams[m.away_team] = { name: m.away_team, group: m.stage, J:0, G:0, N:0, P:0, Bp:0, Bc:0, Dif:0, Pts:0, form:[] };
  }

  // Matches déjà triés par kickoff_at
  for (const m of matches) {
    if (m.status !== "finished" || m.home_score === null) continue;
    const h = teams[m.home_team];
    const a = teams[m.away_team];
    const hs = Number(m.home_score);
    const as_ = Number(m.away_score);

    h.J++; a.J++;
    h.Bp += hs; h.Bc += as_;
    a.Bp += as_; a.Bc += hs;

    if (hs > as_) {
      h.G++; h.Pts += 3; h.form.push("W");
      a.P++; a.form.push("L");
    } else if (hs < as_) {
      a.G++; a.Pts += 3; a.form.push("W");
      h.P++; h.form.push("L");
    } else {
      h.N++; h.Pts += 1; h.form.push("D");
      a.N++; a.Pts += 1; a.form.push("D");
    }
  }

  Object.values(teams).forEach(t => { t.Dif = t.Bp - t.Bc; });

  const groups: Record<string, TeamStat[]> = {};
  Object.values(teams).forEach(t => {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  });

  Object.values(groups).forEach(g => {
    g.sort((a, b) => {
      if (b.Pts !== a.Pts) return b.Pts - a.Pts;
      if (b.Dif !== a.Dif) return b.Dif - a.Dif;
      return b.Bp - a.Bp;
    });
  });

  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  );
}

function FlagImg({ team }: { team: string }) {
  const url = getFlagUrl(team, "sm");
  if (!url) return <span className="w-5 h-4 bg-gray-100 rounded inline-block"></span>;
  return <img src={url} alt={team} className="w-5 h-4 object-cover rounded inline-block" />;
}

function FormDot({ result }: { result: FormResult }) {
  const colors = { W: "bg-[#00A650]", D: "bg-gray-400", L: "bg-[#E8192C]" };
  const labels = { W: "V", D: "N", L: "D" };
  return (
    <span title={labels[result]} className={`w-2.5 h-2.5 rounded-full ${colors[result]} inline-block`}></span>
  );
}

export default async function GroupsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const groupMatches = allMatches.filter((m: any) =>
    typeof m.stage === "string" && m.stage.startsWith("Groupe")
  );

  const standings = computeStandings(groupMatches);

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <WcNav
        leagueId={id}
        leagueName={(league as any).name}
        code={(league as any).code}
        isAdmin={isAdmin}
        activeTab="classements"
      />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Classements et groupes</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(standings).map(([groupName, teams]) => (
            <div key={groupName} className="bg-white shadow-sm rounded-xl overflow-hidden">

              {/* En-tête groupe */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-[#1A1A1A] text-sm flex-1">{groupName}</h3>
                <div className="flex gap-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
                  <span className="w-5 text-center">J</span>
                  <span className="w-5 text-center">G</span>
                  <span className="w-5 text-center">N</span>
                  <span className="w-5 text-center">P</span>
                  <span className="w-7 text-center">Dif.</span>
                  <span className="w-8 text-center font-bold text-gray-600">Pts</span>
                  <span className="w-14 text-center">Forme</span>
                </div>
              </div>

              {/* Équipes */}
              {teams.map((team, i) => {
                const qualified = i < 2;
                const thirdPlace = i === 2;
                return (
                  <div key={team.name}
                    className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 last:border-0">

                    <div className={`w-1 h-7 rounded-full shrink-0 ${
                      qualified ? "bg-[#00A650]" :
                      thirdPlace ? "bg-[#F5A623]" :
                      "bg-gray-200"
                    }`}></div>

                    <span className="text-xs text-gray-400 w-4 text-center shrink-0">{i + 1}</span>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <FlagImg team={team.name} />
                      <span className="text-xs font-semibold text-[#1A1A1A] truncate">{team.name}</span>
                    </div>

                    <div className="flex gap-2 text-xs text-center shrink-0">
                      <span className="w-5 text-gray-500">{team.J}</span>
                      <span className="w-5 text-gray-500">{team.G}</span>
                      <span className="w-5 text-gray-500">{team.N}</span>
                      <span className="w-5 text-gray-500">{team.P}</span>
                      <span className={`w-7 font-medium ${team.Dif > 0 ? "text-[#00A650]" : team.Dif < 0 ? "text-[#E8192C]" : "text-gray-500"}`}>
                        {team.Dif > 0 ? `+${team.Dif}` : team.Dif}
                      </span>
                      <span className="w-8 font-bold text-[#1A1A1A]">{team.Pts}</span>
                      <div className="w-14 flex items-center justify-center gap-0.5">
                        {/* Jusqu'à 3 matchs de groupe */}
                        {[0, 1, 2].map((idx) => {
                          const r = team.form[idx];
                          if (!r) return (
                            <span key={idx} className="w-2.5 h-2.5 rounded-full bg-gray-100 border border-gray-200 inline-block"></span>
                          );
                          return <FormDot key={idx} result={r} />;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Légende */}
              <div className="px-3 py-1.5 bg-gray-50 flex items-center gap-3 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#00A650] inline-block"></span> Qualifié</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] inline-block"></span> Potentiellement qualifié</span>
                <span className="flex items-center gap-1.5 ml-auto">
                  <span className="w-2 h-2 rounded-full bg-[#00A650] inline-block"></span>V
                  <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>N
                  <span className="w-2 h-2 rounded-full bg-[#E8192C] inline-block"></span>D
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
