// @ts-nocheck
// Endpoint one-shot : peuple api_match_id sur tous les matchs DB
// À supprimer après utilisation
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const FR_TO_EN: Record<string, string> = {
  "etats unis":"united states","mexique":"mexico","afrique du sud":"south africa",
  "coree du sud":"south korea","bosnie herzegovine":"bosnia-herzegovina",
  "bosnie et herzegovine":"bosnia-herzegovina","colombie":"colombia","suisse":"switzerland",
  "angleterre":"england","croatie":"croatia","nouvelle zelande":"new zealand",
  "equateur":"ecuador","perou":"peru","chili":"chile","argentine":"argentina",
  "bresil":"brazil","algerie":"algeria","senegal":"senegal","allemagne":"germany",
  "arabie saoudite":"saudi arabia","japon":"japan","australie":"australia",
  "espagne":"spain","maroc":"morocco","tunisie":"tunisia","egypte":"egypt",
  "serbie":"serbia","georgie":"georgia","suede":"sweden","norvege":"norway",
  "cameroun":"cameroon","ecosse":"scotland","italie":"italy","slovaquie":"slovakia",
  "pays bas":"netherlands","pologne":"poland","autriche":"austria","belgique":"belgium",
  "danemark":"denmark","rd congo":"dr congo","republique democratique du congo":"dr congo",
  "cote d ivoire":"ivory coast","cote divoire":"ivory coast","cap vert":"cape verde",
  "paraguai":"paraguay","indonesie":"indonesia","ouzbekistan":"uzbekistan",
  "portugal":"portugal","uruguay":"uruguay","canada":"canada","france":"france",
  "ghana":"ghana","panama":"panama","nigeria":"nigeria","jamaique":"jamaica",
  "costa rica":"costa rica",
};
const API_ALIASES: Record<string, string> = {
  "usa":"united states","korea republic":"south korea","republic of korea":"south korea",
  "ivory coast":"ivory coast","côte d'ivoire":"ivory coast","dr congo":"dr congo",
  "congo dr":"dr congo","bosnia and herzegovina":"bosnia-herzegovina",
  "cape verde":"cape verde","cabo verde":"cape verde",
};

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/&/g,"and").replace(/-/g," ").replace(/['''`]/g,"").replace(/\s+/g," ").trim();
}
function toEn(fr: string): string { const n = norm(fr); return FR_TO_EN[n] ?? n; }
function normApi(api: string): string { const n = norm(api); return API_ALIASES[n] ?? n; }
function teamsMatch(db: string, api: string): boolean {
  const dbEn = norm(toEn(db));
  const apiEn = normApi(norm(api));
  if (dbEn === apiEn) return true;
  if (norm(db) === apiEn) return true;
  if (dbEn.includes(apiEn) || apiEn.includes(dbEn)) return true;
  const dbWords = dbEn.split(" ").filter((w: string) => w.length >= 4);
  const apiWords = apiEn.split(" ").filter((w: string) => w.length >= 4);
  return dbWords.some((w: string) => apiWords.includes(w));
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const API_KEY = process.env.API_FOOTBALL_KEY;
  if (!API_KEY) return NextResponse.json({ error: "API_FOOTBALL_KEY manquant" }, { status: 500 });

  // 1. Récupérer tous les matchs WC depuis football-data.org
  const apiRes = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
    headers: { "X-Auth-Token": API_KEY }, cache: "no-store",
  });
  if (!apiRes.ok) return NextResponse.json({ error: `API ${apiRes.status}` }, { status: 500 });
  const { matches: apiMatches } = await apiRes.json();

  // 2. Récupérer tous les matchs DB sans api_match_id
  const supabase = createAdminClient();
  const { data: dbMatches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at, api_match_id")
    .is("api_match_id", null)
    .order("kickoff_at");

  const results = { matched: 0, skipped: 0, ambiguous: [] as string[] };

  for (const m of dbMatches ?? []) {
    const kickoff = new Date(m.kickoff_at).getTime();

    // Filtrer par fenêtre ±36h pour éviter les faux positifs inter-journées
    // Fenêtre progressive : ±2h → ±6h → ±36h
    let candidates: any[] = [];
    for (const windowH of [2, 6, 36]) {
      candidates = apiMatches.filter((f: any) => {
        const diffH = Math.abs(new Date(f.utcDate).getTime() - kickoff) / 3600000;
        return diffH < windowH;
      });
      if (candidates.length > 0) break;
    }

    const found = candidates.filter((f: any) =>
      teamsMatch(m.home_team, f.homeTeam?.name ?? "") &&
      teamsMatch(m.away_team, f.awayTeam?.name ?? "")
    );

    if (found.length === 1) {
      await supabase.from("matches")
        .update({ api_match_id: found[0].id })
        .eq("id", m.id);
      results.matched++;
    } else if (found.length === 0) {
      results.skipped++;
    } else {
      results.ambiguous.push(`${m.home_team} vs ${m.away_team}: ${found.length} candidats`);
    }
  }

  return NextResponse.json({
    success: true,
    api_matches_total: apiMatches.length,
    db_matches_without_id: (dbMatches ?? []).length,
    ...results,
  });
}
