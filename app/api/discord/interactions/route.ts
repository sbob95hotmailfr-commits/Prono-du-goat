// @ts-nocheck
import nacl from "tweetnacl";
import { NextRequest, NextResponse } from "next/server";
import { buildStandingsEmbed } from "@/lib/discord";
import { createClient } from "@supabase/supabase-js";
import { formatDate } from "@/lib/utils";

function verifySignature(body: string, signature: string, timestamp: string): boolean {
  const publicKeyHex = process.env.DISCORD_PUBLIC_KEY ?? "";
  if (!publicKeyHex || !signature || !timestamp) return false;
  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKeyHex, "hex")
    );
  } catch {
    return false;
  }
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-signature-ed25519") ?? "";
  const timestamp = req.headers.get("x-signature-timestamp") ?? "";

  if (!verifySignature(body, signature, timestamp)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const interaction = JSON.parse(body);

  // PING de Discord (vérification de l'endpoint)
  if (interaction.type === 1) return NextResponse.json({ type: 1 });

  // APPLICATION_COMMAND
  if (interaction.type === 2) {
    const name = interaction.data?.name;
    const options: Record<string, any> = Object.fromEntries(
      (interaction.data?.options ?? []).map((o: any) => [o.name, o.value])
    );

    const supabase = getSupabase();

    // ── /prochain-match ──────────────────────────────────────────────────────
    if (name === "prochain-match") {
      const { data: match } = await supabase
        .from("matches")
        .select("home_team, away_team, kickoff_at, stage, home_flag, away_flag")
        .gt("kickoff_at", new Date().toISOString())
        .order("kickoff_at")
        .limit(1)
        .single() as any;

      if (!match) {
        return NextResponse.json({ type: 4, data: { content: "Aucun match à venir trouvé.", flags: 64 } });
      }

      return NextResponse.json({
        type: 4,
        data: {
          embeds: [{
            color: 0x003DA5,
            title: `⚽ ${match.home_team} vs ${match.away_team}`,
            description: `**${match.stage}**\n📅 ${formatDate(match.kickoff_at)}`,
            footer: { text: "Le Prono du GOAT · WC 2026" },
          }],
        },
      });
    }

    // ── /classement [code] ───────────────────────────────────────────────────
    if (name === "classement") {
      const code = (options.code ?? "").toUpperCase().trim();
      const { data: league } = await supabase
        .from("leagues").select("id, name").eq("code", code).single() as any;

      if (!league) {
        return NextResponse.json({ type: 4, data: { content: `❌ Ligue introuvable avec le code **${code}**.`, flags: 64 } });
      }

      const { data: standings } = await supabase
        .from("league_standings").select("username, total_points")
        .eq("league_id", league.id).order("total_points", { ascending: false }) as any;

      const { data: aiPreds } = await supabase
        .from("ai_match_predictions").select("points_earned") as any;
      const aiPts = (aiPreds ?? []).reduce((s: number, p: any) => s + (p.points_earned ?? 0), 0);

      return NextResponse.json({
        type: 4,
        data: { embeds: [buildStandingsEmbed(league.name, standings ?? [], aiPts)] },
      });
    }

    // ── /pronos [code] [match?] ──────────────────────────────────────────────
    if (name === "pronos") {
      const code = (options.code ?? "").toUpperCase().trim();
      const { data: league } = await supabase
        .from("leagues").select("id, name").eq("code", code).single() as any;

      if (!league) {
        return NextResponse.json({ type: 4, data: { content: `❌ Ligue introuvable avec le code **${code}**.`, flags: 64 } });
      }

      const matchNum = options.match;
      let matchQuery = supabase.from("matches")
        .select("id, home_team, away_team, home_score, away_score, stage")
        .eq("status", "finished").order("kickoff_at", { ascending: false });
      matchQuery = matchNum ? matchQuery.limit(matchNum) : matchQuery.limit(1);
      const { data: matchesResult } = await matchQuery as any;
      const match = matchesResult?.[matchNum ? matchNum - 1 : 0];

      if (!match) {
        return NextResponse.json({ type: 4, data: { content: "Aucun match terminé trouvé.", flags: 64 } });
      }

      const { data: preds } = await supabase
        .from("predictions")
        .select("home_score_pred, away_score_pred, points_earned, user_id")
        .eq("match_id", match.id).eq("league_id", league.id) as any;

      if (!preds?.length) {
        return NextResponse.json({ type: 4, data: { content: `Aucun pronostic pour **${match.home_team} vs ${match.away_team}**.`, flags: 64 } });
      }

      const userIds = preds.map((p: any) => p.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds) as any;
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.username]));

      const sorted = preds
        .map((p: any) => ({ ...p, username: profileMap[p.user_id] ?? "?" }))
        .sort((a: any, b: any) => (b.points_earned ?? 0) - (a.points_earned ?? 0));

      const medals = ["🥇", "🥈", "🥉"];
      const lines = sorted.slice(0, 10).map((p: any, i: number) =>
        `${medals[i] ?? `${i + 1}.`} **${p.username}** — ${p.home_score_pred}-${p.away_score_pred} · +${p.points_earned ?? 0}pts`
      );

      return NextResponse.json({
        type: 4,
        data: {
          embeds: [{
            color: 0x00A650,
            title: `📊 Pronos — ${match.home_team} ${match.home_score}-${match.away_score} ${match.away_team}`,
            description: lines.join("\n"),
            footer: { text: `${league.name} · Le Prono du GOAT` },
          }],
        },
      });
    }
  }

  return NextResponse.json({ type: 1 });
}
