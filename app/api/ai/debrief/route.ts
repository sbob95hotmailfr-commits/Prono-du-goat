// @ts-nocheck
// Débrief IA post-match : Claude analyse le match terminé
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { matchId, leagueId } = await req.json();
  if (!matchId || !leagueId) return NextResponse.json({ error: "matchId et leagueId requis" }, { status: 400 });

  const admin = createAdminClient();

  // Cache existant
  const { data: existing } = await admin
    .from("match_ai_analyses")
    .select("content")
    .eq("match_id", matchId)
    .eq("type", "debrief")
    .single();

  if (existing) return NextResponse.json({ content: existing.content });

  // Données du match
  const { data: match } = await admin
    .from("matches")
    .select("home_team, away_team, home_flag, away_flag, home_score, away_score, stage, status")
    .eq("id", matchId)
    .single() as any;

  if (!match || (match as any).status !== "finished") return NextResponse.json({ error: "Match non terminé" }, { status: 400 });

  // Pronostics de la ligue pour ce match
  const { data: preds } = await admin
    .from("predictions")
    .select("home_score_pred, away_score_pred, points_earned, user_id")
    .eq("match_id", matchId)
    .eq("league_id", leagueId)
    .not("points_earned", "is", null);

  const predCount = preds?.length ?? 0;
  const exactCount = (preds ?? []).filter((p: any) => p.points_earned >= 3).length;
  const correctCount = (preds ?? []).filter((p: any) => (p.points_earned ?? 0) > 0).length;

  // Noms des utilisateurs
  let exactNames: string[] = [];
  if (exactCount > 0) {
    const exactIds = (preds ?? []).filter((p: any) => p.points_earned >= 3).map((p: any) => p.user_id);
    const { data: profiles } = await admin.from("profiles").select("id, username").in("id", exactIds);
    exactNames = (profiles ?? []).map((p: any) => p.username);
  }

  const scoreLabel = match.home_score > match.away_score
    ? `victoire ${match.home_team}` : match.away_score > match.home_score
    ? `victoire ${match.away_team}` : "match nul";

  const prompt = `Tu es un consultant sportif fun. Écris un débrief post-match court (4-5 phrases) pour une ligue de pronostics entre amis.

Match : ${match.home_flag ?? ""} ${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team} ${match.away_flag ?? ""}
Phase : ${match.stage}
Résultat : ${scoreLabel}

Pronostics de la ligue :
- ${predCount} pronostiqueurs
- ${exactCount} score(s) exact(s)${exactNames.length > 0 ? ` (${exactNames.join(", ")})` : ""}
- ${correctCount} bon(s) résultat(s)

Ton débrief doit :
1. Commenter le résultat (surprenant ? logique ?)
2. Féliciter ceux qui ont visé juste${exactNames.length > 0 ? ` (cite les par prénom)` : ""}
3. Taquiner gentiment ceux qui ont raté si tout le monde a raté
4. Terminer par une phrase d'anticipation pour la suite

Ton fun, complice, comme dans un groupe WhatsApp de potes foot. En français.`;

  let content: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    content = message.content[0].type === "text" ? message.content[0].text : "";
    if (!content) throw new Error("Réponse vide");
  } catch (e: any) {
    console.error("[debrief] Anthropic error:", e?.status, e?.message);
    return NextResponse.json({ error: "Débrief impossible pour le moment, réessaie dans quelques secondes." }, { status: 500 });
  }

  await admin.from("match_ai_analyses").upsert(
    { match_id: matchId, type: "debrief", content },
    { onConflict: "match_id,type" }
  );

  return NextResponse.json({ content });
}
