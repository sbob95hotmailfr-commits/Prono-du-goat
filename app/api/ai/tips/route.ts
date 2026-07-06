// @ts-nocheck
// Conseils IA personnalisés : Claude donne des tips d'amélioration par joueur
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { leagueId } = await req.json();
  if (!leagueId) return NextResponse.json({ error: "leagueId requis" }, { status: 400 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles").select("username").eq("id", user.id).single();

  const { data: preds } = await admin
    .from("predictions")
    .select("home_score_pred, away_score_pred, points_earned, matches(home_score, away_score, home_team, away_team, stage)")
    .eq("user_id", user.id)
    .eq("league_id", leagueId)
    .not("points_earned", "is", null);

  if (!preds?.length || preds.length < 3) {
    return NextResponse.json({ error: "Pas assez de pronostics (minimum 3)" }, { status: 400 });
  }

  const total = preds.length;
  const exact = preds.filter((p: any) => (p.points_earned ?? 0) >= 3).length;
  const goodResult = preds.filter((p: any) => (p.points_earned ?? 0) > 0 && (p.points_earned ?? 0) < 3).length;
  const missed = preds.filter((p: any) => (p.points_earned ?? 0) === 0).length;

  const avgPred = preds.reduce((s: number, p: any) => s + p.home_score_pred + p.away_score_pred, 0) / total;
  const avgReal = preds.reduce((s: number, p: any) => {
    const m = p.matches;
    return s + (m?.home_score ?? 0) + (m?.away_score ?? 0);
  }, 0) / total;

  const bias = avgPred > avgReal + 0.5 ? "optimiste (tu prédis trop de buts)"
    : avgPred < avgReal - 0.5 ? "prudent (tu prédis peu de buts)"
    : "bien calibré sur les scores";

  // Identify patterns
  const missedHighScoring = preds.filter((p: any) => {
    const m = p.matches;
    return m && (m.home_score + m.away_score) >= 4 && (p.points_earned ?? 0) === 0;
  }).length;

  const prompt = `Tu es un coach de pronostics sportifs bienveillant et direct.

Joueur : ${profile?.username ?? "Joueur"}
Stats sur ${total} matchs :
- Scores exacts : ${exact} (${Math.round(exact/total*100)}%)
- Bons résultats : ${goodResult} (${Math.round(goodResult/total*100)}%)
- Ratés : ${missed} (${Math.round(missed/total*100)}%)
- Biais : ${bias}
${missedHighScoring > 2 ? `- A raté ${missedHighScoring} matchs à score élevé` : ""}

Donne 3 conseils personnalisés et actionnables pour améliorer ses pronostics. Sois direct, fun, et précis.
Format : 3 conseils numérotés, 1-2 phrases chacun. Tutoiement. Français.`;

  let content: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }],
    });
    content = message.content[0].type === "text" ? message.content[0].text : "";
    if (!content) throw new Error("Réponse vide");
  } catch {
    return NextResponse.json({ error: "Conseils IA indisponibles, réessaie dans quelques secondes." }, { status: 500 });
  }

  return NextResponse.json({ content });
}
