// @ts-nocheck
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculatePoints } from "@/lib/points";

// Traduction noms FR → noms API Football (anglais)
const FR_TO_EN: Record<string, string> = {
  "états-unis": "united states",
  "mexique": "mexico",
  "afrique du sud": "south africa",
  "corée du sud": "south korea",
  "tchéquie": "czechia",
  "bosnie-herzégovine": "bosnia and herzegovina",
  "ouzbékistan": "uzbekistan",
  "colombie": "colombia",
  "suisse": "switzerland",
  "angleterre": "england",
  "croatie": "croatia",
  "nouvelle-zélande": "new zealand",
  "équateur": "ecuador",
  "pérou": "peru",
  "chili": "chile",
  "argentine": "argentina",
  "brésil": "brazil",
  "algérie": "algeria",
  "sénégal": "senegal",
  "allemagne": "germany",
  "arabie saoudite": "saudi arabia",
  "japon": "japan",
  "australie": "australia",
  "espagne": "spain",
  "maroc": "morocco",
  "tunisie": "tunisia",
  "égypte": "egypt",
  "serbie": "serbia",
  "géorgie": "georgia",
  "suède": "sweden",
  "cameroun": "cameroon",
  "écosse": "scotland",
  "italie": "italy",
  "slovaquie": "slovakia",
  "pays-bas": "netherlands",
  "pologne": "poland",
  "autriche": "austria",
  "belgique": "belgium",
  "danemark": "denmark",
  "rd congo": "dr congo",
  "république démocratique du congo": "dr congo",
  "côte d'ivoire": "ivory coast",
  "nigeria": "nigeria",
  "ghana": "ghana",
  "panama": "panama",
  "qatar": "qatar",
  "canada": "canada",
  "iran": "iran",
  "portugal": "portugal",
  "uruguay": "uruguay",
  "france": "france",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['']/g, "")
    .trim();
}

function toEnglish(frName: string): string {
  const norm = normalize(frName);
  return FR_TO_EN[norm] ?? norm;
}

function teamsMatch(dbName: string, apiName: string): boolean {
  const dbEn = toEnglish(dbName);
  const apiNorm = normalize(apiName);
  return dbEn === apiNorm || normalize(dbName) === apiNorm;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const adminSupabase = createAdminClient();

  // Vérifier que l'utilisateur est admin d'au moins une ligue
  const { data: adminLeagues } = await adminSupabase
    .from("leagues").select("id").eq("admin_id", user.id);
  if (!adminLeagues?.length) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Récupérer tous les matchs non terminés dont le coup d'envoi est passé depuis 105+ min
  const cutoff = new Date(Date.now() - 105 * 60 * 1000).toISOString();
  const { data: pendingMatches } = await adminSupabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at")
    .neq("status", "finished")
    .lt("kickoff_at", cutoff)
    .order("kickoff_at");

  if (!pendingMatches?.length) {
    return NextResponse.json({ success: true, updated: 0, message: "Aucun match à synchroniser" });
  }

  // Grouper par date UTC
  const byDate: Record<string, typeof pendingMatches> = {};
  for (const m of pendingMatches) {
    const date = m.kickoff_at.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(m);
  }

  const API_KEY = process.env.API_FOOTBALL_KEY;
  if (!API_KEY) return NextResponse.json({ error: "Clé API Football manquante" }, { status: 500 });

  let totalUpdated = 0;
  const errors: string[] = [];

  for (const [date, matches] of Object.entries(byDate)) {
    // Récupérer les fixtures API Football pour ce jour (WC2026 = league 1, saison 2026)
    let fixtures: any[] = [];
    try {
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?league=1&season=2026&date=${date}`,
        { headers: { "x-apisports-key": API_KEY }, next: { revalidate: 0 } }
      );
      const json = await res.json();
      fixtures = json?.response ?? [];
    } catch (e) {
      errors.push(`Erreur API pour ${date}`);
      continue;
    }

    // Ne garder que les fixtures terminées
    const finished = fixtures.filter(
      (f: any) => f.fixture?.status?.short === "FT" || f.fixture?.status?.short === "AET" || f.fixture?.status?.short === "PEN"
    );

    for (const dbMatch of matches) {
      // Trouver le fixture correspondant par noms d'équipe
      const fixture = finished.find((f: any) =>
        teamsMatch(dbMatch.home_team, f.teams?.home?.name) &&
        teamsMatch(dbMatch.away_team, f.teams?.away?.name)
      );

      if (!fixture) continue;

      const homeScore = fixture.goals?.home ?? 0;
      const awayScore = fixture.goals?.away ?? 0;

      // Mettre à jour le match
      const { error: matchErr } = await adminSupabase
        .from("matches")
        .update({ home_score: homeScore, away_score: awayScore, status: "finished" })
        .eq("id", dbMatch.id);

      if (matchErr) { errors.push(`Match ${dbMatch.id}: ${matchErr.message}`); continue; }

      // Calculer les points pour tous les pronostics de ce match
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

  return NextResponse.json({
    success: true,
    updated: totalUpdated,
    message: `${totalUpdated} match(s) synchronisé(s)${errors.length ? ` — ${errors.length} erreur(s)` : ""}`,
    errors: errors.length ? errors : undefined,
  });
}
