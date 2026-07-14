// Génère les debriefs IA post-match pour toutes les ligues ayant des prédictions
// Appelé après synchronisation d'un match terminé
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateAutoDebriefs(matchId: string, supabase: SupabaseClient) {
  const { data: match } = await supabase
    .from("matches")
    .select("home_team, away_team, home_flag, away_flag, home_score, away_score, stage")
    .eq("id", matchId)
    .single();

  if (!match) return 0;

  // Ligues avec des prédictions scorées pour ce match
  const { data: preds } = await supabase
    .from("predictions")
    .select("league_id, points_earned, user_id")
    .eq("match_id", matchId)
    .not("points_earned", "is", null);

  if (!preds?.length) return 0;

  const leagueIds = Array.from(new Set(preds.map((p: any) => p.league_id))) as string[];
  let generated = 0;

  for (const leagueId of leagueIds) {
    // Éviter les doublons
    const { data: existing } = await supabase
      .from("match_ai_analyses")
      .select("id")
      .eq("match_id", matchId)
      .eq("type", `debrief_${leagueId}`)
      .maybeSingle();

    if (existing) continue;

    const leaguePreds = preds.filter((p: any) => p.league_id === leagueId);
    const exactCount = leaguePreds.filter((p: any) => (p.points_earned ?? 0) >= 3).length;
    const correctCount = leaguePreds.filter((p: any) => (p.points_earned ?? 0) > 0).length;

    let exactNames: string[] = [];
    if (exactCount > 0) {
      const exactIds = leaguePreds
        .filter((p: any) => (p.points_earned ?? 0) >= 3)
        .map((p: any) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", exactIds);
      exactNames = (profiles ?? []).map((p: any) => p.username);
    }

    const scoreLabel =
      (match.home_score ?? 0) > (match.away_score ?? 0)
        ? `victoire ${match.home_team}`
        : (match.away_score ?? 0) > (match.home_score ?? 0)
        ? `victoire ${match.away_team}`
        : "match nul";

    const prompt = `Tu es un consultant sportif fun. Écris un débrief post-match court (4-5 phrases) pour une ligue de pronostics entre amis.

Match : ${match.home_flag ?? ""} ${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team} ${match.away_flag ?? ""}
Phase : ${match.stage}
Résultat : ${scoreLabel}

Pronostics de la ligue :
- ${leaguePreds.length} pronostiqueurs
- ${exactCount} score(s) exact(s)${exactNames.length > 0 ? ` (${exactNames.join(", ")})` : ""}
- ${correctCount} bon(s) résultat(s)

Ton débrief doit : commenter le résultat, féliciter ceux qui ont visé juste${exactNames.length > 0 ? ` (cite-les)` : ""}, taquiner gentiment si tout le monde a raté, terminer par une phrase d'anticipation.
Ton fun, complice, comme dans un groupe WhatsApp de potes foot. En français. Pas de titre ni de markdown.`;

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      });
      const content = message.content[0].type === "text" ? message.content[0].text : "";
      if (!content) continue;

      await supabase
        .from("match_ai_analyses")
        .upsert({ match_id: matchId, type: `debrief_${leagueId}`, content }, { onConflict: "match_id,type" });

      generated++;
    } catch (e: any) {
      console.error("[auto-debrief]", matchId, leagueId, e?.message);
    }
  }

  return generated;
}
