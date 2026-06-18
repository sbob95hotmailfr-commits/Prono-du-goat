// @ts-nocheck
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculatePoints } from "@/lib/points";

const FR_TO_EN: Record<string, string> = {
  "etats-unis": "united states",
  "mexique": "mexico",
  "afrique du sud": "south africa",
  "coree du sud": "south korea",
  "tchequie": "czechia",
  "republique tcheque": "czech republic",
  "bosnie-herzegovine": "bosnia and herzegovina",
  "ouzbekistan": "uzbekistan",
  "colombie": "colombia",
  "suisse": "switzerland",
  "angleterre": "england",
  "croatie": "croatia",
  "nouvelle-zelande": "new zealand",
  "equateur": "ecuador",
  "perou": "peru",
  "chili": "chile",
  "argentine": "argentina",
  "bresil": "brazil",
  "algerie": "algeria",
  "senegal": "senegal",
  "allemagne": "germany",
  "arabie saoudite": "saudi arabia",
  "japon": "japan",
  "australie": "australia",
  "espagne": "spain",
  "maroc": "morocco",
  "tunisie": "tunisia",
  "egypte": "egypt",
  "serbie": "serbia",
  "georgie": "georgia",
  "suede": "sweden",
  "cameroun": "cameroon",
  "ecosse": "scotland",
  "italie": "italy",
  "slovaquie": "slovakia",
  "pays-bas": "netherlands",
  "hollande": "netherlands",
  "pologne": "poland",
  "autriche": "austria",
  "belgique": "belgium",
  "danemark": "denmark",
  "rd congo": "dr congo",
  "rdc": "dr congo",
  "cote divoire": "ivory coast",
  "cote d ivoire": "ivory coast",
  "nigeria": "nigeria",
  "ghana": "ghana",
  "panama": "panama",
  "qatar": "qatar",
  "canada": "canada",
  "iran": "iran",
  "portugal": "portugal",
  "uruguay": "uruguay",
  "france": "france",
  "honduras": "honduras",
  "costa rica": "costa rica",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // supprime les accents
    .replace(/[&]/g, "and")            // & → and
    .replace(/['''`]/g, "")
    .replace(/[-]/g, " ")              // tirets → espaces
    .replace(/\s+/g, " ")
    .trim();
}

function toEnglish(frName: string): string {
  const norm = normalize(frName);
  return FR_TO_EN[norm] ?? norm;
}

function teamsMatch(dbName: string, apiName: string): boolean {
  const dbEn = normalize(toEnglish(dbName));
  const apiNorm = normalize(apiName);
  if (dbEn === apiNorm) return true;
  if (normalize(dbName) === apiNorm) return true;
  // Correspondance partielle
  if (apiNorm.includes(dbEn) || dbEn.includes(apiNorm)) return true;
  // Premiers mots (ex: "Korea Republic" vs "South Korea")
  const dbWords = dbEn.split(" ");
  const apiWords = apiNorm.split(" ");
  const shared = dbWords.filter(w => w.length > 3 && apiWords.includes(w));
  if (shared.length >= 1 && (dbWords.length === 1 || apiWords.length === 1)) return true;
  return false;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const adminSupabase = createAdminClient();

  const { data: adminLeagues } = await adminSupabase
    .from("leagues").select("id").eq("admin_id", user.id);
  if (!adminLeagues?.length) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Matchs non terminés dont le coup d'envoi est passé depuis plus de 105 min
  const cutoff = new Date(Date.now() - 105 * 60 * 1000).toISOString();
  const { data: pendingMatches } = await adminSupabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at")
    .neq("status", "finished")
    .lt("kickoff_at", cutoff)
    .order("kickoff_at");

  if (!pendingMatches?.length) {
    return NextResponse.json({ success: true, updated: 0, message: "Aucun match à synchroniser pour l'instant" });
  }

  const API_KEY = process.env.API_FOOTBALL_KEY;
  if (!API_KEY) return NextResponse.json({ error: "Clé API_FOOTBALL_KEY manquante" }, { status: 500 });

  // Grouper par date (YYYY-MM-DD en UTC)
  const byDate: Record<string, typeof pendingMatches> = {};
  for (const m of pendingMatches) {
    const date = m.kickoff_at.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(m);
  }

  let totalUpdated = 0;
  const errors: string[] = [];
  const notFound: string[] = [];

  for (const [date, matches] of Object.entries(byDate)) {
    let fixtures: any[] = [];
    try {
      // Essai 1 : WC2026 (league=1, season=2026)
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${date}`,
        { headers: { "x-apisports-key": API_KEY }, cache: "no-store" }
      );
      const json = await res.json();
      fixtures = json?.response ?? [];

      // Essai 2 : si rien, chercher sans filtre de ligue (toutes les compétitions ce jour)
      if (!fixtures.length) {
        const res2 = await fetch(
          `https://v3.football.api-sports.io/fixtures?date=${date}&timezone=UTC`,
          { headers: { "x-apisports-key": API_KEY }, cache: "no-store" }
        );
        const json2 = await res2.json();
        fixtures = json2?.response ?? [];
      }
    } catch (e) {
      errors.push(`Erreur réseau pour ${date}`);
      continue;
    }

    const finishedFixtures = fixtures.filter(
      (f: any) => ["FT", "AET", "PEN"].includes(f.fixture?.status?.short)
    );

    for (const dbMatch of matches) {
      const fixture = finishedFixtures.find((f: any) =>
        teamsMatch(dbMatch.home_team, f.teams?.home?.name ?? "") &&
        teamsMatch(dbMatch.away_team, f.teams?.away?.name ?? "")
      );

      if (!fixture) {
        notFound.push(`${dbMatch.home_team} vs ${dbMatch.away_team}`);
        continue;
      }

      const homeScore = fixture.goals?.home ?? 0;
      const awayScore = fixture.goals?.away ?? 0;

      const { error: matchErr } = await adminSupabase
        .from("matches")
        .update({ home_score: homeScore, away_score: awayScore, status: "finished" })
        .eq("id", dbMatch.id);

      if (matchErr) { errors.push(`Erreur match: ${matchErr.message}`); continue; }

      const { data: preds } = await adminSupabase
        .from("predictions")
        .select("id, home_score_pred, away_score_pred")
        .eq("match_id", dbMatch.id);

      if (preds?.length) {
        await Promise.all(preds.map((pred: any) => {
          const points = calculatePoints(pred.home_score_pred, pred.away_score_pred, homeScore, awayScore);
          return adminSupabase.from("predictions")
            .update({ points_earned: points, is_locked: true })
            .eq("id", pred.id);
        }));
      }

      totalUpdated++;
    }
  }

  let message = `${totalUpdated} match(s) mis à jour`;
  if (notFound.length) message += ` — ${notFound.length} non trouvé(s) sur API Football`;
  if (errors.length) message += ` — ${errors.length} erreur(s)`;

  return NextResponse.json({ success: true, updated: totalUpdated, message, notFound, errors });
}
