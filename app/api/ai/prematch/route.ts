// @ts-nocheck
// Agent IA pré-match : analyse Claude avant le coup d'envoi
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { matchId } = await req.json();
  if (!matchId) return NextResponse.json({ error: "matchId requis" }, { status: 400 });

  const admin = createAdminClient();

  // Vérifie si une analyse existe déjà en cache
  const { data: existing } = await admin
    .from("match_ai_analyses")
    .select("content")
    .eq("match_id", matchId)
    .eq("type", "prematch")
    .single();

  if (existing) return NextResponse.json({ content: existing.content });

  // Charge les infos du match
  const { data: match } = await admin
    .from("matches")
    .select("home_team, away_team, home_flag, away_flag, stage, kickoff_at, status")
    .eq("id", matchId)
    .single();

  if (!match) return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
  if (match.status === "finished") return NextResponse.json({ error: "Match terminé" }, { status: 400 });

  // Stats des joueurs des deux équipes
  const { data: players } = await admin
    .from("players")
    .select("name, position, player_stats(goals, assists)")
    .in("team_name", [match.home_team, match.away_team])
    .order("name");

  const scorers = (players ?? [])
    .filter((p: any) => (p.player_stats?.goals ?? 0) > 0)
    .sort((a: any, b: any) => (b.player_stats?.goals ?? 0) - (a.player_stats?.goals ?? 0))
    .slice(0, 6)
    .map((p: any) => `${p.name} (${p.player_stats?.goals} buts)`);

  const kickoffDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(new Date(match.kickoff_at));

  const prompt = `Tu es un consultant sportif passionné et expert de la Coupe du Monde 2026.

Match : ${match.home_flag ?? ""} ${match.home_team} vs ${match.away_team} ${match.away_flag ?? ""}
Phase : ${match.stage}
Coup d'envoi : ${kickoffDate}
${scorers.length > 0 ? `Meilleurs buteurs du tournoi dans ces équipes : ${scorers.join(", ")}` : ""}

Génère une analyse pré-match courte et engageante (4-5 phrases maximum) qui :
1. Présente l'enjeu du match en une phrase
2. Cite 2 facteurs clés à surveiller
3. Propose un pronostic de score précis avec une justification courte

Règles strictes :
- N'écris PAS de titre, pas de ligne d'introduction avec les noms des équipes, commence directement par l'analyse
- N'utilise pas de markdown (pas de #, **, __, etc.)
- Écris en français correct, sans fautes d'orthographe ni de grammaire
- Ton direct et enthousiaste, comme un ami qui s'y connaît en foot
- Termine TOUJOURS par : "Mon pronostic : X-Y"`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0].type === "text" ? message.content[0].text : "";

  // Sauvegarde en cache
  await admin.from("match_ai_analyses").upsert(
    { match_id: matchId, type: "prematch", content },
    { onConflict: "match_id,type" }
  );

  return NextResponse.json({ content });
}
