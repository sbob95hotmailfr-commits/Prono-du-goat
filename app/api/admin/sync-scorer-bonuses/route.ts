// @ts-nocheck
// Recalcule automatiquement les bonus buteurs pour tous les matchs terminés
// en récupérant les buteurs réels depuis football-data.org (fix.goals)
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculatePoints, calculateScorerBonusMulti } from "@/lib/points";

const FR_TO_EN: Record<string, string> = {
  "etats unis": "united states", "mexique": "mexico", "afrique du sud": "south africa",
  "coree du sud": "south korea", "colombie": "colombia", "suisse": "switzerland",
  "angleterre": "england", "croatie": "croatia", "nouvelle zelande": "new zealand",
  "equateur": "ecuador", "perou": "peru", "chili": "chile", "argentine": "argentina",
  "bresil": "brazil", "algerie": "algeria", "senegal": "senegal", "allemagne": "germany",
  "arabie saoudite": "saudi arabia", "japon": "japan", "australie": "australia",
  "espagne": "spain", "maroc": "morocco", "tunisie": "tunisia", "egypte": "egypt",
  "serbie": "serbia", "georgie": "georgia", "suede": "sweden", "norvege": "norway",
  "cameroun": "cameroon", "ecosse": "scotland", "italie": "italy", "slovaquie": "slovakia",
  "pays bas": "netherlands", "pologne": "poland", "autriche": "austria",
  "belgique": "belgium", "danemark": "denmark", "rd congo": "dr congo",
  "cote d ivoire": "ivory coast", "cote divoire": "ivory coast", "cap vert": "cape verde",
  "paraguai": "paraguay", "paraguai": "paraguay", "indonesie": "indonesia",
  "ouzbekistan": "uzbekistan", "portugal": "portugal", "uruguay": "uruguay",
  "canada": "canada", "france": "france", "ghana": "ghana", "turquie": "turkey",
};
const API_ALIASES: Record<string, string> = {
  "usa": "united states", "korea republic": "south korea", "republic of korea": "south korea",
  "côte d'ivoire": "ivory coast", "ivory coast": "ivory coast",
  "dr congo": "dr congo", "congo dr": "dr congo", "bosnia and herzegovina": "bosnia-herzegovina",
};
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and")
    .replace(/-/g, " ").replace(/['''`]/g, "").replace(/\s+/g, " ").trim();
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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: adminLeagues } = await adminSupabase
    .from("leagues").select("id").eq("admin_id", user.id);
  if (!adminLeagues?.length) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const API_KEY = process.env.API_FOOTBALL_KEY;
  if (!API_KEY) return NextResponse.json({ error: "API_FOOTBALL_KEY manquant" }, { status: 500 });

  // Récupérer tous les matchs terminés en base
  const { data: finishedMatches } = await adminSupabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score")
    .eq("status", "finished")
    .not("home_score", "is", null);

  if (!finishedMatches?.length) {
    return NextResponse.json({ success: true, message: "Aucun match terminé", updated: 0 });
  }

  // Récupérer tous les matchs WC depuis l'API (1 seul appel)
  const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
    headers: { "X-Auth-Token": API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: "Erreur API football-data.org", details: err }, { status: 502 });
  }
  const apiData = await res.json();
  const allFixtures: any[] = apiData.matches ?? [];
  const doneFixtures = allFixtures.filter((f: any) => f.status === "FINISHED");

  // Charger tous les joueurs pour le mapping api_football_id → db id
  const { data: allPlayers } = await adminSupabase
    .from("players").select("id, api_football_id, name");
  const apiToDb = new Map(
    (allPlayers ?? []).map((p: any) => [Number(p.api_football_id), p.id as string])
  );

  let matchesProcessed = 0;
  let predictionsUpdated = 0;
  let bonusesUpdated = 0;
  const skipped: string[] = [];
  const unmappedScorers: string[] = [];

  for (const m of finishedMatches) {
    // Trouver le match correspondant dans l'API
    const fix = doneFixtures.find((f: any) =>
      teamsMatch(m.home_team, f.homeTeam?.name ?? "") &&
      teamsMatch(m.away_team, f.awayTeam?.name ?? "")
    );

    if (!fix) {
      skipped.push(`${m.home_team} vs ${m.away_team}`);
      continue;
    }

    // Extraire les buteurs réels
    const goals: any[] = fix.goals ?? [];
    const scorerApiIds: number[] = goals
      .filter((g: any) => g.scorer?.id)
      .map((g: any) => Number(g.scorer.id));

    // Mapper vers les IDs joueurs en DB (conserver doublons pour hat-trick)
    const realScorerDbIds: string[] = scorerApiIds
      .map((id) => apiToDb.get(id))
      .filter((id): id is string => Boolean(id));

    // Tracer les buteurs non mappés pour diagnostic
    goals.forEach((g: any) => {
      if (g.scorer?.id && !apiToDb.get(Number(g.scorer.id))) {
        unmappedScorers.push(`${g.scorer.name ?? g.scorer.id} (${m.home_team} vs ${m.away_team})`);
      }
    });

    // Sauvegarder les buteurs réels dans match_scorers — ne supprimer que si l'API retourne des données
    if (realScorerDbIds.length > 0) {
      await adminSupabase.from("match_scorers").delete().eq("match_id", m.id);
      await Promise.all(
        realScorerDbIds.map((playerId) =>
          adminSupabase.from("match_scorers").insert({ match_id: m.id, player_id: playerId })
        )
      );
    }

    // Récupérer toutes les prédictions + pronostics buteur en parallèle
    const [{ data: preds }, { data: scorerPreds }] = await Promise.all([
      adminSupabase.from("predictions")
        .select("id, home_score_pred, away_score_pred")
        .eq("match_id", m.id),
      adminSupabase.from("scorer_predictions")
        .select("prediction_id, player_id")
        .not("prediction_id", "is", null),
    ]);

    if (!preds?.length) {
      matchesProcessed++;
      continue;
    }

    const predIds = preds.map((p: any) => p.id);

    // Récupérer uniquement les scorer_predictions de ce match
    const { data: matchScorerPreds } = await adminSupabase
      .from("scorer_predictions")
      .select("prediction_id, player_id")
      .in("prediction_id", predIds);

    const byPred: Record<string, string[]> = {};
    for (const sp of matchScorerPreds ?? []) {
      if (!byPred[sp.prediction_id]) byPred[sp.prediction_id] = [];
      if (sp.player_id) byPred[sp.prediction_id].push(sp.player_id);
    }

    // Calculer et sauvegarder points = score + bonus buteur en parallèle
    await Promise.all(preds.map(async (p: any) => {
      const pts = calculatePoints(p.home_score_pred, p.away_score_pred, m.home_score, m.away_score);
      const predictedIds = byPred[p.id] ?? [];
      const bonus = realScorerDbIds.length > 0
        ? calculateScorerBonusMulti(predictedIds, realScorerDbIds)
        : 0;
      await adminSupabase.from("predictions")
        .update({ points_earned: pts + bonus, is_locked: true })
        .eq("id", p.id);
      predictionsUpdated++;
    }));

    // Mettre à jour bonus_earned sur scorer_predictions en parallèle
    await Promise.all(Object.keys(byPred).map(async (predId) => {
      const bonus = realScorerDbIds.length > 0
        ? calculateScorerBonusMulti(byPred[predId], realScorerDbIds)
        : 0;
      await adminSupabase.from("scorer_predictions")
        .update({ bonus_earned: bonus })
        .eq("prediction_id", predId);
      bonusesUpdated++;
    }));

    matchesProcessed++;
  }

  return NextResponse.json({
    success: true,
    matches_processed: matchesProcessed,
    predictions_updated: predictionsUpdated,
    bonuses_updated: bonusesUpdated,
    skipped_count: skipped.length,
    skipped,
    unmapped_scorers_count: unmappedScorers.length,
    unmapped_scorers: unmappedScorers,
  });
}
