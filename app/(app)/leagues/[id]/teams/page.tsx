/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { WcNav } from "@/components/wc-nav";
import { getFlagUrl } from "@/lib/flags";

// Mapping confédération → équipes WC2026
const CONFEDERATION_MAP: Record<string, string[]> = {
  UEFA: [
    "Allemagne", "Angleterre", "Autriche", "Belgique", "Croatie", "Danemark",
    "Ecosse", "Espagne", "France", "Géorgie", "Hongrie", "Italie",
    "Pays-Bas", "Pologne", "Portugal", "République Tchèque", "Roumanie",
    "Serbie", "Slovaquie", "Slovénie", "Suisse", "Turquie", "Ukraine",
    "Scotland", "England", "France", "Germany", "Spain", "Portugal",
    "Netherlands", "Belgium", "Croatia", "Denmark", "Austria", "Switzerland",
    "Turkey", "Poland", "Serbia", "Ukraine", "Slovakia", "Czech Republic",
    "Romania", "Hungary", "Georgia", "Slovenia", "Scotland", "Italy",
    "Albania", "Bosnia-Herzegovina", "Montenegro",
  ],
  CONMEBOL: [
    "Argentine", "Brésil", "Chili", "Colombie", "Equateur", "Paraguay",
    "Pérou", "Uruguay", "Venezuela", "Bolivia",
    "Argentina", "Brazil", "Chile", "Colombia", "Ecuador", "Paraguay",
    "Peru", "Uruguay", "Venezuela", "Bolivia",
  ],
  CONCACAF: [
    "Canada", "États-Unis", "Mexique", "Costa Rica", "Honduras", "Jamaïque",
    "Panama", "El Salvador", "Cuba", "Trinidad-et-Tobago", "Guatemala",
    "USA", "Mexico", "Jamaica", "Trinidad and Tobago",
  ],
  AFC: [
    "Arabie Saoudite", "Australie", "Bahreïn", "Chine", "Corée du Sud",
    "Émirats Arabes Unis", "Inde", "Indonésie", "Irak", "Iran", "Japon",
    "Jordanie", "Kirghizistan", "Ouzbékistan", "Qatar", "Thaïlande",
    "Vietnam", "Yémen",
    "Saudi Arabia", "Australia", "Bahrain", "China", "South Korea",
    "UAE", "India", "Indonesia", "Iraq", "Iran", "Japan",
    "Jordan", "Kyrgyzstan", "Uzbekistan", "Qatar", "Thailand",
  ],
  CAF: [
    "Afrique du Sud", "Algérie", "Angola", "Cameroun", "Congo RD",
    "Côte d'Ivoire", "Egypte", "Ghana", "Kenya", "Malawi", "Mali",
    "Maroc", "Mozambique", "Namibie", "Nigéria", "Sénégal",
    "Tanzanie", "Tunisie", "Zambie", "Zimbabwe",
    "South Africa", "Algeria", "Angola", "Cameroon", "DR Congo",
    "Ivory Coast", "Egypt", "Ghana", "Kenya", "Malawi", "Mali",
    "Morocco", "Mozambique", "Namibia", "Nigeria", "Senegal",
    "Tanzania", "Tunisia", "Zambia", "Zimbabwe",
  ],
  OFC: [
    "Nouvelle-Zélande", "Fidji", "Papouasie-Nouvelle-Guinée", "Vanuatu",
    "New Zealand", "Fiji", "Papua New Guinea",
  ],
};

const HOST_NATIONS = ["Canada", "USA", "Mexico", "États-Unis", "Mexique"];
const HOST_COLORS: Record<string, string> = {
  Canada: "#D52B1E",
  USA: "#002868",
  Mexico: "#006847",
  "États-Unis": "#002868",
  Mexique: "#006847",
};

function getConfederation(team: string): string {
  for (const [conf, teams] of Object.entries(CONFEDERATION_MAP)) {
    if (teams.some(t => t.toLowerCase() === team.toLowerCase())) return conf;
  }
  return "Autre";
}

function FlagImg({ team }: { team: string }) {
  const url = getFlagUrl(team, "md");
  return (
    <div className="w-10 h-7 rounded overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
      {url
        ? <img src={url} alt={team} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400">?</div>
      }
    </div>
  );
}

export default async function TeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ conf?: string }>;
}) {
  const { id } = await params;
  const { conf: activeConf = "Tout" } = await searchParams;

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

  // Extraire toutes les équipes et leurs stats
  const teamMap: Record<string, {
    group: string;
    pts: number;
    j: number;
    form: ("W"|"D"|"L")[];
    lastResult: string | null;
    confederation: string;
    isHost: boolean;
  }> = {};

  for (const m of groupMatches) {
    for (const team of [m.home_team, m.away_team]) {
      if (!teamMap[team]) {
        teamMap[team] = {
          group: m.stage,
          pts: 0, j: 0,
          form: [],
          lastResult: null,
          confederation: getConfederation(team),
          isHost: HOST_NATIONS.some(h => h.toLowerCase() === team.toLowerCase()),
        };
      }
    }
    if (m.status === "finished" && m.home_score !== null) {
      const hs = Number(m.home_score);
      const as_ = Number(m.away_score);
      const h = teamMap[m.home_team];
      const a = teamMap[m.away_team];
      h.j++; a.j++;
      if (hs > as_) { h.pts += 3; h.form.push("W"); a.form.push("L"); }
      else if (hs < as_) { a.pts += 3; a.form.push("W"); h.form.push("L"); }
      else { h.pts += 1; h.form.push("D"); a.pts += 1; a.form.push("D"); }
      h.lastResult = `${hs}-${as_} vs ${m.away_team}`;
      a.lastResult = `${as_}-${hs} vs ${m.home_team}`;
    }
  }

  const allTeams = Object.entries(teamMap).sort((a, b) => {
    const confA = a[1].confederation;
    const confB = b[1].confederation;
    if (confA !== confB) return confA.localeCompare(confB);
    return a[0].localeCompare(b[0]);
  });

  const confTabs = ["Tout", "AFC", "CAF", "CONCACAF", "CONMEBOL", "OFC", "UEFA"];

  const filteredTeams = activeConf === "Tout"
    ? allTeams
    : allTeams.filter(([, s]) => s.confederation === activeConf);

  const hostTeams = allTeams.filter(([, s]) => s.isHost);

  const formColors = { W: "bg-[#00A650]", D: "bg-gray-400", L: "bg-[#E8192C]" };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <WcNav
        leagueId={id}
        leagueName={(league as any).name}
        code={(league as any).code}
        isAdmin={isAdmin}
        activeTab="equipes"
      />

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Pays hôtes */}
        {activeConf === "Tout" && hostTeams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Pays hôtes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {hostTeams.map(([team, stats]) => {
                const bgColor = HOST_COLORS[team] ?? "#1A1A1A";
                return (
                  <div
                    key={team}
                    className="rounded-xl overflow-hidden text-white relative"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className="p-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1 block">Pays hôte</span>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-8 rounded overflow-hidden border border-white/30">
                          {getFlagUrl(team, "md") && (
                            <img src={getFlagUrl(team, "md")!} alt={team} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <h3 className="text-lg font-bold">{team}</h3>
                      </div>
                      <div className="text-xs opacity-80">
                        <span className="font-semibold">{stats.group}</span>
                        {stats.j > 0 && (
                          <span className="ml-2">{stats.pts} pts · {stats.j} match{stats.j > 1 ? "s" : ""}</span>
                        )}
                      </div>
                      {stats.form.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {stats.form.slice(-3).map((r, i) => (
                            <span key={i} className={`w-3 h-3 rounded-full ${formColors[r]} opacity-90 inline-block`}></span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtre confédération */}
        <div className="mb-4">
          <h2 className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-3">Équipes qualifiées</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {confTabs.map(conf => (
              <a
                key={conf}
                href={`/leagues/${id}/teams?conf=${conf}`}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap border transition-colors ${
                  activeConf === conf
                    ? "bg-[#003DA5] text-white border-[#003DA5]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {conf}
              </a>
            ))}
          </div>
        </div>

        {/* Grille équipes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTeams.filter(([, s]) => !s.isHost || activeConf !== "Tout").map(([team, stats]) => (
            <div key={team} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 p-3">
                <FlagImg team={team} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1A1A1A] text-sm truncate">{team}</p>
                  <p className="text-[11px] text-gray-400">{stats.group}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-[#003DA5] text-lg leading-none">{stats.pts}</p>
                  <p className="text-[10px] text-gray-400">pts</p>
                </div>
              </div>

              <div className="border-t border-gray-50 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400 mr-1">Forme</span>
                  {stats.form.length === 0 && (
                    <span className="text-[10px] text-gray-300">À jouer</span>
                  )}
                  {stats.form.slice(-3).map((r, i) => (
                    <span key={i} className={`w-2.5 h-2.5 rounded-full ${formColors[r]} inline-block`}></span>
                  ))}
                </div>
                <span className="text-[10px] text-gray-400">{stats.j} match{stats.j > 1 ? "s" : ""} joué{stats.j > 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>

        {filteredTeams.filter(([, s]) => !s.isHost || activeConf !== "Tout").length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">
            Aucune équipe trouvée pour cette confédération.
          </div>
        )}
      </div>
    </div>
  );
}
