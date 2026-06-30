// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const EN_TO_FR: Record<string, string> = {
  "united states": "États-Unis", "mexico": "Mexique", "south africa": "Afrique du Sud",
  "south korea": "Corée du Sud", "czech republic": "Tchéquie", "czechia": "Tchéquie",
  "bosnia and herzegovina": "Bosnie-Herzégovine", "bosnia-herzegovina": "Bosnie-Herzégovine",
  "colombia": "Colombie", "switzerland": "Suisse", "england": "Angleterre",
  "croatia": "Croatie", "new zealand": "Nouvelle-Zélande", "ecuador": "Équateur",
  "peru": "Pérou", "chile": "Chili", "argentina": "Argentine", "brazil": "Brésil",
  "algeria": "Algérie", "senegal": "Sénégal", "germany": "Allemagne",
  "saudi arabia": "Arabie Saoudite", "japan": "Japon", "australia": "Australie",
  "spain": "Espagne", "morocco": "Maroc", "tunisia": "Tunisie", "egypt": "Égypte",
  "serbia": "Serbie", "georgia": "Géorgie", "sweden": "Suède", "norway": "Norvège",
  "cameroon": "Cameroun", "scotland": "Écosse", "italy": "Italie",
  "slovakia": "Slovaquie", "netherlands": "Pays-Bas", "poland": "Pologne",
  "austria": "Autriche", "belgium": "Belgique", "denmark": "Danemark",
  "dr congo": "RD Congo", "congo dr": "RD Congo", "ivory coast": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire", "cape verde": "Cap-Vert", "cabo verde": "Cap-Vert",
  "cape verde islands": "Cap-Vert", "paraguay": "Paraguay", "indonesia": "Indonésie",
  "uzbekistan": "Ouzbékistan", "portugal": "Portugal", "uruguay": "Uruguay",
  "canada": "Canada", "france": "France", "ghana": "Ghana", "turkey": "Turquie",
  "türkiye": "Turquie", "iran": "Iran", "iraq": "Irak", "jordan": "Jordanie",
  "haiti": "Haïti", "panama": "Panama", "qatar": "Qatar", "honduras": "Honduras",
  "costa rica": "Costa Rica", "curacao": "Curaçao", "curaçao": "Curaçao",
  "venezuela": "Venezuela", "paraguay": "Paraguay", "bolivia": "Bolivie",
  "romania": "Roumanie", "ukraine": "Ukraine", "russia": "Russie",
  "china pr": "Chine", "china": "Chine", "nigeria": "Nigéria",
  "new caledonia": "Nouvelle-Calédonie", "trinidad and tobago": "Trinidad et Tobago",
  "jamaica": "Jamaïque", "cuba": "Cuba", "el salvador": "El Salvador",
  "guatemala": "Guatemala", "nicaragua": "Nicaragua",
};

const POSITION_FR: Record<string, string> = {
  "Goalkeeper": "Gardien", "Defence": "Défenseur", "Midfield": "Milieu",
  "Offence": "Attaquant", "Defender": "Défenseur", "Midfielder": "Milieu",
  "Forward": "Attaquant",
};

function toFr(en: string): string {
  return EN_TO_FR[en.toLowerCase()] ?? en;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: adminLeagues } = await adminSupabase
    .from("leagues").select("id").eq("admin_id", user.id);
  if (!adminLeagues?.length) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const API_KEY = process.env.API_FOOTBALL_KEY;
  if (!API_KEY) return NextResponse.json({ error: "API_FOOTBALL_KEY manquant" }, { status: 500 });

  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/scorers?limit=100",
    { headers: { "X-Auth-Token": API_KEY }, cache: "no-store" }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    return NextResponse.json({ error: "Erreur API", details: errData }, { status: 502 });
  }

  const data = await res.json();
  const scorers = data.scorers ?? [];

  if (!scorers.length) {
    return NextResponse.json({ success: true, message: "Aucun buteur disponible pour le moment", updated: 0 });
  }

  // Charger tous les joueurs en base
  const { data: dbPlayers } = await adminSupabase
    .from("players")
    .select("id, api_football_id, name");

  // Forcer la comparaison numérique pour éviter les discordances de type string/number
  const playerByApiId = new Map((dbPlayers ?? []).map((p: any) => [Number(p.api_football_id), p.id]));
  const playerByNorm = new Map((dbPlayers ?? []).map((p: any) => [normalize(p.name), p.id]));

  const rows: { player_id: string; goals: number; assists: number; matches_played: number }[] = [];
  let matchedById = 0;
  let matchedByName = 0;
  let inserted = 0;
  const stillUnmatched: string[] = [];

  for (const s of scorers) {
    const apiPlayerId = s.player?.id;
    const playerName = s.player?.name ?? "?";
    let dbPlayerId: string | undefined;

    // 1. Match par api_football_id (comparaison numérique)
    dbPlayerId = playerByApiId.get(Number(apiPlayerId));
    if (dbPlayerId) {
      matchedById++;
    }

    // 2. Fallback par nom normalisé
    if (!dbPlayerId) {
      dbPlayerId = playerByNorm.get(normalize(playerName));
      if (dbPlayerId) {
        matchedByName++;
        // Corriger l'ID en base pour les prochaines syncs
        await adminSupabase.from("players").update({ api_football_id: apiPlayerId }).eq("id", dbPlayerId);
        playerByApiId.set(apiPlayerId, dbPlayerId);
      }
    }

    // 3. Fallback DB : recherche ILIKE par nom (capte les variantes d'écriture)
    if (!dbPlayerId && playerName !== "?") {
      const { data: dbMatch } = await adminSupabase
        .from("players")
        .select("id")
        .ilike("name", playerName)
        .maybeSingle();
      if (dbMatch?.id) {
        dbPlayerId = dbMatch.id;
        matchedByName++;
        await adminSupabase.from("players").update({ api_football_id: Number(apiPlayerId) }).eq("id", dbPlayerId);
        playerByApiId.set(Number(apiPlayerId), dbPlayerId);
      }
    }

    // 4. Insérer le joueur manquant directement depuis l'API scorers
    if (!dbPlayerId && apiPlayerId && playerName !== "?") {
      const teamNameEn = s.team?.name ?? s.team?.shortName ?? "";
      const teamNameFr = toFr(teamNameEn);
      const positionFr = POSITION_FR[s.player?.position ?? ""] ?? "Attaquant";

      const { data: newPlayer, error: insertErr } = await adminSupabase
        .from("players")
        .insert({
          api_football_id: Number(apiPlayerId),
          name: playerName,
          team_name: teamNameFr,
          position: positionFr,
        })
        .select("id")
        .single();

      if (!insertErr && newPlayer?.id) {
        dbPlayerId = newPlayer.id;
        playerByApiId.set(Number(apiPlayerId), dbPlayerId);
        playerByNorm.set(normalize(playerName), dbPlayerId);
        inserted++;
      } else {
        // Dernier recours : upsert sur le nom exact en cas de conflit d'ID
        const { data: upserted } = await adminSupabase
          .from("players")
          .select("id")
          .eq("api_football_id", Number(apiPlayerId))
          .maybeSingle();
        if (upserted?.id) {
          dbPlayerId = upserted.id;
          inserted++;
        } else {
          stillUnmatched.push(`${playerName} (err: ${insertErr?.message})`);
          continue;
        }
      }
    }

    if (!dbPlayerId) {
      stillUnmatched.push(playerName);
      continue;
    }

    rows.push({
      player_id: dbPlayerId,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      matches_played: s.playedMatches ?? 0,
    });
  }

  // Remplacer player_stats par les données fraîches
  await adminSupabase.from("player_stats").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (rows.length) {
    await adminSupabase.from("player_stats").insert(rows);
  }

  return NextResponse.json({
    success: true,
    scorers_from_api: scorers.length,
    matched_by_id: matchedById,
    matched_by_name: matchedByName,
    inserted_new: inserted,
    total_in_stats: rows.length,
    still_unmatched: stillUnmatched,
  });
}
