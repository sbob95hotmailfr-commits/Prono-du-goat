// @ts-nocheck
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { calculatePoints, calculateScorerBonusMulti } from "@/lib/points";

const client = new Anthropic();

interface AiPrediction {
  home_score: number;
  away_score: number;
  scorer_ids: string[];
  reasoning: string;
}

export async function generateAiPrediction(matchId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Vérifier que la prédiction n'existe pas déjà
  const { data: existing } = await supabase
    .from("ai_match_predictions").select("id").eq("match_id", matchId).single();
  if (existing) return { success: true };

  // Récupérer les infos du match
  const { data: match } = await supabase
    .from("matches").select("*").eq("id", matchId).single() as any;
  if (!match) return { success: false, error: "Match introuvable" };

  // Stats joueurs des deux équipes (top buteurs)
  const { data: homePlayers } = await supabase
    .from("players")
    .select("id, name, position")
    .eq("team_name", match.home_team)
    .limit(20) as any;

  const { data: awayPlayers } = await supabase
    .from("players")
    .select("id, name, position")
    .eq("team_name", match.away_team)
    .limit(20) as any;

  // Top scorers du tournoi pour avoir le contexte de forme
  const { data: topScorers } = await supabase
    .from("player_stats")
    .select("player_id, goals, assists, matches_played")
    .order("goals", { ascending: false })
    .limit(20) as any;

  const scorerIds = new Set((topScorers ?? []).map((s: any) => s.player_id));

  // Enrichir les joueurs avec leurs stats
  const enrichPlayers = (players: any[]) =>
    (players ?? []).map((p: any) => {
      const stats = (topScorers ?? []).find((s: any) => s.player_id === p.id);
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        goals: stats?.goals ?? 0,
        assists: stats?.assists ?? 0,
      };
    }).sort((a: any, b: any) => b.goals - a.goals);

  const homeEnriched = enrichPlayers(homePlayers ?? []);
  const awayEnriched = enrichPlayers(awayPlayers ?? []);

  // Contexte résultats récents des deux équipes
  const { data: recentHome } = await supabase
    .from("matches")
    .select("home_team, away_team, home_score, away_score, stage")
    .or(`home_team.eq.${match.home_team},away_team.eq.${match.home_team}`)
    .eq("status", "finished")
    .order("kickoff_at", { ascending: false })
    .limit(5) as any;

  const { data: recentAway } = await supabase
    .from("matches")
    .select("home_team, away_team, home_score, away_score, stage")
    .or(`home_team.eq.${match.away_team},away_team.eq.${match.away_team}`)
    .eq("status", "finished")
    .order("kickoff_at", { ascending: false })
    .limit(5) as any;

  const formatRecent = (matches: any[], team: string) =>
    (matches ?? []).map((m: any) => {
      const isHome = m.home_team === team;
      const gf = isHome ? m.home_score : m.away_score;
      const ga = isHome ? m.away_score : m.home_score;
      const opp = isHome ? m.away_team : m.home_team;
      const result = gf > ga ? "V" : gf < ga ? "D" : "N";
      return `${result} ${gf}-${ga} vs ${opp} (${m.stage})`;
    }).join(", ") || "Aucun résultat";

  const prompt = `Tu es un expert en pronostics football. Tu dois pronostiquer le match suivant de la Coupe du Monde 2026.

MATCH : ${match.home_team} vs ${match.away_team}
PHASE : ${match.stage}

FORME RÉCENTE ${match.home_team} : ${formatRecent(recentHome, match.home_team)}
FORME RÉCENTE ${match.away_team} : ${formatRecent(recentAway, match.away_team)}

JOUEURS ${match.home_team} (buts dans le tournoi) :
${homeEnriched.slice(0, 10).map((p: any) => `- ${p.name} (${p.position}) : ${p.goals} buts`).join("\n") || "- Données non disponibles"}

JOUEURS ${match.away_team} (buts dans le tournoi) :
${awayEnriched.slice(0, 10).map((p: any) => `- ${p.name} (${p.position}) : ${p.goals} buts`).join("\n") || "- Données non disponibles"}

Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après :
{
  "home_score": <entier 0-6>,
  "away_score": <entier 0-6>,
  "scorer_ids": [<id_joueur_1>, <id_joueur_2>],
  "reasoning": "<explication courte en français, 1-2 phrases>"
}

Pour scorer_ids : choisis 1 à 3 IDs de joueurs parmi ceux listés ci-dessus qui sont susceptibles de marquer. Utilise exactement les IDs fournis.`;

  let prediction: AiPrediction;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    prediction = JSON.parse(raw.trim());

    // Valider les champs
    if (typeof prediction.home_score !== "number" || typeof prediction.away_score !== "number") {
      throw new Error("Format invalide");
    }
    prediction.scorer_ids = (prediction.scorer_ids ?? []).filter(
      (id: string) => typeof id === "string" && id.length > 10
    ).slice(0, 3);
  } catch (e: any) {
    return { success: false, error: `Parsing Claude: ${e.message}` };
  }

  // Insérer la prédiction
  const { error: insertErr } = await supabase.from("ai_match_predictions").insert({
    match_id: matchId,
    home_score_pred: Math.max(0, Math.min(10, Math.round(prediction.home_score))),
    away_score_pred: Math.max(0, Math.min(10, Math.round(prediction.away_score))),
    reasoning: prediction.reasoning ?? "",
  });
  if (insertErr) return { success: false, error: insertErr.message };

  // Insérer les buteurs pronostiqués
  if (prediction.scorer_ids.length > 0) {
    for (let i = 0; i < prediction.scorer_ids.length; i++) {
      await supabase.from("ai_scorer_predictions").insert({
        match_id: matchId,
        player_id: prediction.scorer_ids[i],
        slot: i + 1,
      });
    }
  }

  return { success: true };
}

export async function scoreAiPredictions(
  matchId: string,
  homeScore: number,
  awayScore: number,
  realScorerDbIds: string[]
): Promise<void> {
  const supabase = createAdminClient();

  const { data: pred } = await supabase
    .from("ai_match_predictions").select("id, home_score_pred, away_score_pred")
    .eq("match_id", matchId).single() as any;
  if (!pred) return;

  const pts = calculatePoints(pred.home_score_pred, pred.away_score_pred, homeScore, awayScore);

  const { data: scorerPreds } = await supabase
    .from("ai_scorer_predictions").select("id, player_id").eq("match_id", matchId) as any;
  const predictedIds = (scorerPreds ?? []).map((s: any) => s.player_id);
  const bonus = realScorerDbIds.length > 0 ? calculateScorerBonusMulti(predictedIds, realScorerDbIds) : 0;

  await supabase.from("ai_match_predictions")
    .update({ points_earned: pts + bonus })
    .eq("match_id", matchId);

  if (bonus > 0 && (scorerPreds ?? []).length > 0) {
    await supabase.from("ai_scorer_predictions")
      .update({ bonus_earned: bonus })
      .eq("match_id", matchId);
  }
}
