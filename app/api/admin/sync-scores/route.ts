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

// Noms spécifiques utilisés par API Football
const API_ALIASES: Record<string, string> = {
  "turkiye": "turkey",
  "usa": "united states",
  "korea republic": "south korea",
  "republic of ireland": "ireland",
  "china pr": "china",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[&]/g, "and")
    .replace(/['''`]/g, "")
    .replace(/[-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toEnglish(frName: string): string {
  const n = normalize(frName);
  return FR_TO_EN[n] ?? n;
}

function normalizeApi(apiName: string): string {
  const n = normalize(apiName);
  return API_ALIASES[n] ?? n;
}

function teamsMatch(dbName: string, apiName: string): boolean {
  const dbEn = normalize(toEnglish(dbName));
  const apiNorm = normalizeApi(apiName);
  if (dbEn === apiNorm) return true;
  if (normalize(dbName) === apiNorm) return true;
  if (apiNorm.includes(dbEn) || dbEn.includes(apiNorm)) return true;
  // Correspondance par mot significatif (4+ chars)
  const dbWords = dbEn.split(" ").filter(w => w.length >= 4);
  const apiWords = apiNorm.split(" ").filter(w => w.length >= 4);
  if (dbWords.some(w => apiWords.includes(w))) return true;
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
      // Vérifier quota
      const remaining = parseInt(res.headers.get("x-ratelimit-requests-remaining") ?? "99");
      if (remaining === 0 || json?.errors?.rateLimit) {
        errors.push("⚠️ Quota API Football épuisé (100 req/jour). Réessaie demain.");
        break;
      }
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
        // Récupérer les bonus buteurs existants pour ne pas les écraser
        const predIds = preds.map((p: any) => p.id);
        const { data: scorerBonuses } = await adminSupabase
          .from("scorer_predictions")
          .select("prediction_id, bonus_earned")
          .in("prediction_id", predIds);
        const bonusMap: Record<string, number> = {};
        for (const sb of scorerBonuses ?? []) {
          if (!(sb.prediction_id in bonusMap)) bonusMap[sb.prediction_id] = sb.bonus_earned ?? 0;
        }

        await Promise.all(preds.map((pred: any) => {
          const points = calculatePoints(pred.home_score_pred, pred.away_score_pred, homeScore, awayScore);
          const bonus = bonusMap[pred.id] ?? 0;
          return adminSupabase.from("predictions")
            .update({ points_earned: points + bonus, is_locked: true })
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
