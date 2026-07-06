// @ts-nocheck
// Génère le profil IA d'un utilisateur via Claude API
// Nécessite au minimum 5 pronostics calculés
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { userId, leagueId } = await req.json();

  if (!userId || !leagueId) {
    return NextResponse.json({ error: "userId et leagueId requis" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Récupère les pronostics calculés de l'utilisateur avec le score réel
  const { data: predictions } = await supabase
    .from("predictions")
    .select("home_score_pred, away_score_pred, points_earned, matches(home_score, away_score)")
    .eq("user_id", userId)
    .eq("league_id", leagueId)
    .not("points_earned", "is", null);

  if (!predictions?.length || predictions.length < 5) {
    return NextResponse.json(
      { error: "Pas assez de pronostics calculés (minimum 5 requis)" },
      { status: 400 }
    );
  }

  const total = predictions.length;
  const exactScores = predictions.filter((p) => p.points_earned === 3).length;
  const correctWinners = predictions.filter((p) => (p.points_earned ?? 0) >= 1).length;
  const exactRate = Math.round((exactScores / total) * 100);
  const winnerRate = Math.round((correctWinners / total) * 100);

  // Calcule le biais de pronostication (optimiste vs prudent)
  const avgPredicted =
    predictions.reduce((sum, p) => sum + p.home_score_pred + p.away_score_pred, 0) / total;
  const avgReal =
    predictions.reduce((sum, p) => {
      const m = p.matches as { home_score: number | null; away_score: number | null } | null;
      return sum + (m?.home_score ?? 0) + (m?.away_score ?? 0);
    }, 0) / total;
  const bias =
    avgPredicted > avgReal + 0.5
      ? "optimiste (prédit trop de buts)"
      : avgPredicted < avgReal - 0.5
      ? "prudent (prédit peu de buts)"
      : "équilibré (proche de la réalité)";

  // Appel Claude API
  let message: any;
  try {
    message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Tu es un analyste sportif fun et bienveillant. Analyse ce pronostiqueur de la Coupe du Monde 2026 :
- Pronostics analysés : ${total}
- Taux de score exact : ${exactRate}%
- Taux de bon vainqueur : ${winnerRate}%
- Biais : ${bias}

Génère un profil avec :
1. Un titre court et fun (ex: "L'Optimiste Inarrêtable", "Le Stratège Prudent", "Le Sniper du Ballon Rond")
2. Une description de 2-3 phrases, ton léger et complice, qui parle directement à la personne (tu/toi)

Réponds UNIQUEMENT en JSON valide, sans markdown : { "profile_type": "...", "description": "..." }`,
        },
      ],
    });
  } catch {
    return NextResponse.json({ error: "Analyse IA indisponible, réessaie dans quelques secondes." }, { status: 500 });
  }

  try {
    const content = message.content[0];
    if (content.type !== "text") throw new Error("Réponse IA inattendue");

    const jsonText = content.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const profile = JSON.parse(jsonText) as { profile_type: string; description: string };

    await supabase.from("ai_profiles").upsert(
      {
        user_id: userId,
        league_id: leagueId,
        profile_type: profile.profile_type,
        description: profile.description,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,league_id" }
    );

    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: "Erreur lors du parsing de la réponse IA" }, { status: 500 });
  }
}
