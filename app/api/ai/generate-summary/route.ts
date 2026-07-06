// @ts-nocheck
// Génère le résumé IA de la journée via Claude API
// Appelé manuellement ou via un cron quotidien après les matchs du soir
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { leagueId } = await req.json();

  if (!leagueId) {
    return NextResponse.json({ error: "leagueId requis" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Récupère les matchs du jour terminés
  const { data: matches } = await supabase
    .from("matches")
    .select("home_team, away_team, home_flag, away_flag, home_score, away_score")
    .eq("status", "finished")
    .gte("kickoff_at", `${today}T00:00:00.000Z`)
    .lte("kickoff_at", `${today}T23:59:59.999Z`);

  if (!matches?.length) {
    return NextResponse.json(
      { error: "Aucun match terminé aujourd'hui" },
      { status: 400 }
    );
  }

  // Récupère les meilleurs pronostiqueurs de la journée dans cette ligue
  const matchIds = matches.map((_, i) => i); // placeholder
  const { data: topPredictions } = await supabase
    .from("predictions")
    .select("points_earned, profiles(username)")
    .eq("league_id", leagueId)
    .order("points_earned", { ascending: false })
    .limit(3);

  const matchSummary = matches
    .map(
      (m) =>
        `${m.home_flag ?? ""} ${m.home_team} ${m.home_score ?? "?"}-${m.away_score ?? "?"} ${m.away_team} ${m.away_flag ?? ""}`
    )
    .join(", ");

  const topPlayers =
    topPredictions
      ?.map((p) => `${(p.profiles as { username: string } | null)?.username ?? "?"} (${p.points_earned} pts)`)
      .join(", ") ?? "Aucun";

  // Appel Claude API
  let contentText: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Tu es un commentateur sportif fun et passionné. Génère un résumé de journée pour une ligue de pronostics de la Coupe du Monde 2026.

Résultats du jour : ${matchSummary}
Meilleurs pronostiqueurs de la journée : ${topPlayers}

Écris un résumé de 3-4 phrases en français, ton dynamique et fun.
Mentionne les surprises du jour et félicite les meilleurs pronostiqueurs.
Commence directement le texte, sans titre.`,
        },
      ],
    });
    const content = message.content[0];
    if (content.type !== "text") throw new Error("Réponse IA inattendue");
    contentText = content.text;
  } catch {
    return NextResponse.json({ error: "Résumé IA indisponible, réessaie dans quelques secondes." }, { status: 500 });
  }

  // Sauvegarde en base (upsert : remplace si déjà généré aujourd'hui)
  await supabase.from("daily_summaries").upsert(
    {
      league_id: leagueId,
      summary_date: today,
      content: contentText,
    },
    { onConflict: "league_id,summary_date" }
  );

  return NextResponse.json({ summary: contentText });
}
