// @ts-nocheck
// Endpoint one-shot : crée les channels Discord + enregistre les slash commands
import { NextRequest, NextResponse } from "next/server";
import { createCategory, createChannel, registerSlashCommands, GUILD_ID } from "@/lib/discord";

const STAGES = [
  "📋 Groupes",
  "⚔️ Phase éliminatoire",
];

const CHANNELS = [
  { name: "📢-resultats", description: "Résultats des matchs en temps réel" },
  { name: "🔔-rappels", description: "Rappels 1h avant chaque match" },
  { name: "🏆-classements", description: "Classements des ligues" },
  { name: "💬-général", description: "Discussion générale" },
];

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guildId = GUILD_ID();
  if (!guildId) return NextResponse.json({ error: "DISCORD_GUILD_ID manquant" }, { status: 500 });

  const results: any = { channels: {}, commands: null, errors: [] };

  // 1. Créer la catégorie principale
  let categoryId: string | undefined;
  try {
    const cat = await createCategory(guildId, "🏆 Le Prono du GOAT");
    categoryId = cat.id;
    results.channels.category = cat.name;
  } catch (e: any) {
    results.errors.push(`Catégorie: ${e.message}`);
  }

  // 2. Créer les channels
  for (const ch of CHANNELS) {
    try {
      const channel = await createChannel(guildId, ch.name, categoryId);
      results.channels[ch.name] = channel.id;
    } catch (e: any) {
      results.errors.push(`Channel ${ch.name}: ${e.message}`);
    }
  }

  // 3. Enregistrer les slash commands
  try {
    const cmds = await registerSlashCommands();
    results.commands = cmds.map((c: any) => c.name);
  } catch (e: any) {
    results.errors.push(`Slash commands: ${e.message}`);
  }

  return NextResponse.json({ success: true, ...results });
}
