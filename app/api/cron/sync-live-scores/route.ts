// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { calculatePoints } from "@/lib/points";

// Traduction noms FR → anglais API Football
const FR_TO_EN: Record<string, string> = {
  "etats unis": "united states", "mexique": "mexico",
  "afrique du sud": "south africa", "coree du sud": "south korea",
  "tchequie": "czechia", "republique tcheque": "czech republic",
  "bosnie herzegovine": "bosnia and herzegovina",
  "ouzbekistan": "uzbekistan", "colombie": "colombia",
  "suisse": "switzerland", "angleterre": "england", "croatie": "croatia",
  "nouvelle zelande": "new zealand", "equateur": "ecuador",
  "perou": "peru", "chili": "chile", "argentine": "argentina",
  "bresil": "brazil", "algerie": "algeria", "senegal": "senegal",
  "allemagne": "germany", "arabie saoudite": "saudi arabia",
  "japon": "japan", "australie": "australia", "espagne": "spain",
  "maroc": "morocco", "tunisie": "tunisia", "egypte": "egypt",
  "serbie": "serbia", "georgie": "georgia", "suede": "sweden",
  "cameroun": "cameroon", "ecosse": "scotland", "italie": "italy",
  "slovaquie": "slovakia", "pays bas": "netherlands",
  "pologne": "poland", "autriche": "austria", "belgique": "belgium",
  "danemark": "denmark", "rd congo": "dr congo",
  "cote d ivoire": "ivory coast", "cote divoire": "ivory coast",
};

// Noms spécifiques utilisés par API Football
const API_ALIASES: Record<string, string> = {
  "turkiye": "turkey",
  "usa": "united states",
  "korea republic": "south korea",
  "republic of ireland": "ireland",
  "china pr": "china",
};

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/&/g, "and")
    .replace(/-/g, " ").replace(/['''`]/g, "")
    .replace(/\s+/g, " ").trim();
}
function toEn(fr: string): string { const n = norm(fr); return FR_TO_EN[n] ?? n; }
function normApi(api: string): string { const n = norm(api); return API_ALIASES[n] ?? n; }
function teamsMatch(db: string, api: string): boolean {
  const dbEn = norm(toEn(db));
  const apiEn = normApi(api);
  if (dbEn === apiEn) return true;
  if (norm(db) === apiEn) return true;
  if (dbEn.includes(apiEn) || apiEn.includes(dbEn)) return true;
  // Correspondance par mot significatif (4+ chars)
  const dbWords = dbEn.split(" ").filter(w => w.length >= 4);
  const apiWords = apiEn.split(" ").filter(w => w.length >= 4);
  return dbWords.some(w => apiWords.includes(w));
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const API_KEY = process.env.API_FOOTBALL_KEY;
  if (!API_KEY) return NextResponse.json({ error: "API_FOOTBALL_KEY manquant" }, { status: 500 });

  const supabase = createAdminClient();

  // Seulement les matchs des 2 derniers jours (conserve le quota API)
  const cutoff = new Date(Date.now() - 95 * 60 * 1000).toISOString();
  const windowStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data: pending } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at")
    .neq("status", "finished")
    .lt("kickoff_at", cutoff)
    .gt("kickoff_at", windowStart)
    .order("kickoff_at");

  if (!pending?.length) return NextResponse.json({ success: true, updated: 0 });

  // Grouper par date — max 1 date par run pour économiser le quota
  const byDate: Record<string, typeof pending> = {};
  for (const m of pending) {
    const d = m.kickoff_at.slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(m);
  }

  // On ne traite qu'une seule date par appel cron (la plus ancienne en attente)
  const datesToProcess = Object.keys(byDate).sort().slice(0, 1);
  let updated = 0;

  for (const date of datesToProcess) {
    const matches = byDate[date];
    let fixtures: any[] = [];
    try {
      const r1 = await fetch(
        `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${date}`,
        { headers: { "x-apisports-key": API_KEY }, cache: "no-store" }
      );
      fixtures = (await r1.json())?.response ?? [];

      if (!fixtures.length) {
        const r2 = await fetch(
          `https://v3.football.api-sports.io/fixtures?date=${date}`,
          { headers: { "x-apisports-key": API_KEY }, cache: "no-store" }
        );
        fixtures = (await r2.json())?.response ?? [];
      }
    } catch { continue; }

    const done = fixtures.filter((f: any) => ["FT", "AET", "PEN"].includes(f.fixture?.status?.short));

    for (const m of matches) {
      const fix = done.find((f: any) =>
        teamsMatch(m.home_team, f.teams?.home?.name ?? "") &&
        teamsMatch(m.away_team, f.teams?.away?.name ?? "")
      );
      if (!fix) continue;

      const hs = fix.goals?.home ?? 0, as_ = fix.goals?.away ?? 0;
      const { error } = await supabase.from("matches")
        .update({ home_score: hs, away_score: as_, status: "finished" }).eq("id", m.id);
      if (error) continue;

      const { data: preds } = await supabase.from("predictions")
        .select("id, home_score_pred, away_score_pred").eq("match_id", m.id);

      if (preds?.length) {
        await Promise.all(preds.map((p: any) => {
          const pts = calculatePoints(p.home_score_pred, p.away_score_pred, hs, as_);
          return supabase.from("predictions").update({ points_earned: pts, is_locked: true }).eq("id", p.id);
        }));
      }
      updated++;
    }
  }

  return NextResponse.json({ success: true, updated });
}
