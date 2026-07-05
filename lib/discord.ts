// @ts-nocheck
const DISCORD_API = "https://discord.com/api/v10";

const BOT_TOKEN = () => process.env.DISCORD_BOT_TOKEN ?? "";
const APP_ID = () => process.env.DISCORD_APP_ID ?? "";
export const GUILD_ID = () => process.env.DISCORD_GUILD_ID ?? "";

function headers() {
  return {
    Authorization: `Bot ${BOT_TOKEN()}`,
    "Content-Type": "application/json",
  };
}

async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${DISCORD_API}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API ${method} ${path} → ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── Channels ────────────────────────────────────────────────────────────────

export async function createChannel(guildId: string, name: string, categoryId?: string) {
  return api("POST", `/guilds/${guildId}/channels`, {
    name,
    type: 0, // GUILD_TEXT
    parent_id: categoryId,
  });
}

export async function createCategory(guildId: string, name: string) {
  return api("POST", `/guilds/${guildId}/channels`, {
    name,
    type: 4, // GUILD_CATEGORY
  });
}

export async function getGuildChannels(guildId: string) {
  return api("GET", `/guilds/${guildId}/channels`);
}

// ─── Messages / Embeds ───────────────────────────────────────────────────────

export async function sendEmbed(channelId: string, embed: any, content?: string) {
  return api("POST", `/channels/${channelId}/messages`, {
    content: content ?? undefined,
    embeds: [embed],
  });
}

// ─── Embeds prédéfinis ───────────────────────────────────────────────────────

export function buildResultEmbed(match: any, topPredictions?: any[]) {
  const homeWin = (match.home_score ?? 0) > (match.away_score ?? 0);
  const awayWin = (match.away_score ?? 0) > (match.home_score ?? 0);
  const isPenalties = !!match.penalty_winner;

  const winner = isPenalties
    ? (match.penalty_winner === "home" ? match.home_team : match.away_team)
    : homeWin ? match.home_team : awayWin ? match.away_team : null;

  const scoreStr = isPenalties
    ? `${match.home_score} — ${match.away_score} (t.a.b)`
    : `${match.home_score} — ${match.away_score}`;

  const fields: any[] = [];
  if (winner) fields.push({ name: "↑ Qualifié", value: `**${winner}**`, inline: true });
  if (topPredictions?.length) {
    fields.push({
      name: "🏆 Meilleurs pronos",
      value: topPredictions.slice(0, 5).map(p =>
        `**${p.username}** — ${p.home_score_pred}-${p.away_score_pred} (+${p.points_earned ?? 0}pts)`
      ).join("\n"),
    });
  }

  return {
    color: 0x003DA5,
    title: `⚽ ${match.home_team} ${scoreStr} ${match.away_team}`,
    description: `**${match.stage}** · Score final`,
    fields,
    footer: { text: "Le Prono du GOAT · WC 2026" },
    timestamp: new Date().toISOString(),
  };
}

export function buildReminderEmbed(match: any, minutesBefore: number) {
  const kickoffParis = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(new Date(match.kickoff_at));

  return {
    color: 0xF5A623,
    title: `🔔 Dans ${minutesBefore} min : ${match.home_team} vs ${match.away_team}`,
    description: `**${match.stage}** · Coup d'envoi à **${kickoffParis}**\n\nVite, fais ton pronostic avant la fermeture !`,
    footer: { text: "Le Prono du GOAT · WC 2026" },
    timestamp: new Date().toISOString(),
  };
}

export function buildStandingsEmbed(leagueName: string, standings: any[], aiPoints: number) {
  const medals = ["🥇", "🥈", "🥉"];
  const allEntries = [
    ...standings.map((s: any) => ({ name: s.username, pts: s.total_points ?? 0, ai: false })),
    { name: "🤖 GOAT IA", pts: aiPoints, ai: true },
  ].sort((a, b) => b.pts - a.pts);

  const lines = allEntries.slice(0, 10).map((e, i) =>
    `${medals[i] ?? `${i + 1}.`} **${e.name}** — ${e.pts} pts`
  );

  return {
    color: 0x003DA5,
    title: `🏆 Classement — ${leagueName}`,
    description: lines.join("\n"),
    footer: { text: "Le Prono du GOAT · WC 2026" },
    timestamp: new Date().toISOString(),
  };
}

// ─── Slash commands ───────────────────────────────────────────────────────────

export async function registerSlashCommands() {
  const commands = [
    {
      name: "classement",
      description: "Affiche le classement d'une ligue",
      options: [{
        name: "code",
        description: "Code de la ligue (8 caractères)",
        type: 3, // STRING
        required: true,
      }],
    },
    {
      name: "prochain-match",
      description: "Affiche le prochain match de la Coupe du Monde 2026",
    },
    {
      name: "pronos",
      description: "Affiche les pronostics d'un match (après verrouillage)",
      options: [
        {
          name: "code",
          description: "Code de la ligue",
          type: 3,
          required: true,
        },
        {
          name: "match",
          description: "Numéro du match (ex: 42)",
          type: 4, // INTEGER
          required: false,
        },
      ],
    },
  ];

  return api("PUT", `/applications/${APP_ID()}/guilds/${GUILD_ID()}/commands`, commands);
}

// ─── Vérification signature Ed25519 ──────────────────────────────────────────

export async function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string
): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY ?? "";
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBuffer(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      hexToBuffer(signature),
      encoder.encode(timestamp + body)
    );
  } catch {
    return false;
  }
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}
