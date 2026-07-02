// @ts-nocheck
import { createAdminClient } from "@/lib/supabase/server";

const EN_TO_FR: Record<string, string> = {
  "united states": "États-Unis", "mexico": "Mexique", "south africa": "Afrique du Sud",
  "south korea": "Corée du Sud", "bosnia and herzegovina": "Bosnie-Herzégovine",
  "bosnia-herzegovina": "Bosnie-Herzégovine", "colombia": "Colombie",
  "switzerland": "Suisse", "england": "Angleterre", "croatia": "Croatie",
  "ecuador": "Équateur", "argentina": "Argentine", "brazil": "Brésil",
  "algeria": "Algérie", "senegal": "Sénégal", "germany": "Allemagne",
  "japan": "Japon", "australia": "Australie", "spain": "Espagne",
  "morocco": "Maroc", "egypt": "Égypte", "sweden": "Suède", "norway": "Norvège",
  "netherlands": "Pays-Bas", "austria": "Autriche", "belgium": "Belgique",
  "dr congo": "RD Congo", "ivory coast": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire", "cape verde": "Cap-Vert",
  "cabo verde": "Cap-Vert", "paraguay": "Paraguay", "portugal": "Portugal",
  "canada": "Canada", "france": "France", "ghana": "Ghana",
  "panama": "Panama", "uruguay": "Uruguay", "nigeria": "Nigéria",
  "jamaica": "Jamaïque", "costa rica": "Costa Rica",
};

const POSITION_FR: Record<string, string> = {
  "Goalkeeper": "Gardien", "Defence": "Défenseur", "Midfield": "Milieu",
  "Offence": "Attaquant", "Defender": "Défenseur", "Midfielder": "Milieu",
  "Forward": "Attaquant",
};

function toFr(en: string): string { return EN_TO_FR[en.toLowerCase()] ?? en; }
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export async function syncPlayerStats(apiKey: string): Promise<{ updated: number; error?: string }> {
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/scorers?limit=100",
    { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
  );
  if (!res.ok) return { updated: 0, error: `API ${res.status}` };

  const data = await res.json();
  const scorers = data.scorers ?? [];
  if (!scorers.length) return { updated: 0 };

  const admin = createAdminClient();
  const { data: dbPlayers } = await admin.from("players").select("id, api_football_id, name");

  const byId = new Map((dbPlayers ?? []).map((p: any) => [Number(p.api_football_id), p.id]));
  const byName = new Map((dbPlayers ?? []).map((p: any) => [norm(p.name), p.id]));

  const rows: { player_id: string; goals: number; assists: number; matches_played: number }[] = [];

  for (const s of scorers) {
    const apiId = Number(s.player?.id);
    const name = s.player?.name ?? "";
    let dbId = byId.get(apiId);

    if (!dbId) {
      dbId = byName.get(norm(name));
      if (dbId) {
        await admin.from("players").update({ api_football_id: apiId }).eq("id", dbId);
        byId.set(apiId, dbId);
      }
    }

    if (!dbId && apiId && name) {
      const teamFr = toFr(s.team?.name ?? "");
      const pos = POSITION_FR[s.player?.position ?? ""] ?? "Attaquant";
      const { data: np } = await admin.from("players")
        .upsert({ api_football_id: apiId, name, team_name: teamFr, position: pos }, { onConflict: "api_football_id" })
        .select("id").single();
      if (np?.id) {
        dbId = np.id;
        byId.set(apiId, dbId);
      }
    }

    if (!dbId) continue;
    rows.push({ player_id: dbId, goals: s.goals ?? 0, assists: s.assists ?? 0, matches_played: s.playedMatches ?? 0 });
  }

  if (rows.length) {
    await admin.from("player_stats").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("player_stats").insert(rows);
  }

  return { updated: rows.length };
}
