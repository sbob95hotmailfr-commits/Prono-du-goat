// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const EN_TO_FR: Record<string, string> = {
  "united states": "États-Unis",
  "mexico": "Mexique",
  "south africa": "Afrique du Sud",
  "south korea": "Corée du Sud",
  "czech republic": "Tchéquie",
  "czechia": "Tchéquie",
  "bosnia and herzegovina": "Bosnie-Herzégovine",
  "bosnia-herzegovina": "Bosnie-Herzégovine",
  "colombia": "Colombie",
  "switzerland": "Suisse",
  "england": "Angleterre",
  "croatia": "Croatie",
  "new zealand": "Nouvelle-Zélande",
  "ecuador": "Équateur",
  "peru": "Pérou",
  "chile": "Chili",
  "argentina": "Argentine",
  "brazil": "Brésil",
  "algeria": "Algérie",
  "senegal": "Sénégal",
  "germany": "Allemagne",
  "saudi arabia": "Arabie Saoudite",
  "japan": "Japon",
  "australia": "Australie",
  "spain": "Espagne",
  "morocco": "Maroc",
  "tunisia": "Tunisie",
  "egypt": "Égypte",
  "serbia": "Serbie",
  "georgia": "Géorgie",
  "sweden": "Suède",
  "norway": "Norvège",
  "cameroon": "Cameroun",
  "scotland": "Écosse",
  "italy": "Italie",
  "slovakia": "Slovaquie",
  "netherlands": "Pays-Bas",
  "poland": "Pologne",
  "austria": "Autriche",
  "belgium": "Belgique",
  "denmark": "Danemark",
  "dr congo": "RD Congo",
  "congo dr": "RD Congo",
  "ivory coast": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire",
  "cape verde": "Cap-Vert",
  "cabo verde": "Cap-Vert",
  "cape verde islands": "Cap-Vert",
  "paraguay": "Paraguay",
  "indonesia": "Indonésie",
  "uzbekistan": "Ouzbékistan",
  "portugal": "Portugal",
  "uruguay": "Uruguay",
  "canada": "Canada",
  "france": "France",
  "ghana": "Ghana",
  "turkey": "Turquie",
  "türkiye": "Turquie",
  "iran": "Iran",
  "iraq": "Irak",
  "jordan": "Jordanie",
  "haiti": "Haïti",
  "panama": "Panama",
  "qatar": "Qatar",
  "honduras": "Honduras",
  "costa rica": "Costa Rica",
  "curacao": "Curaçao",
  "curaçao": "Curaçao",
};

const POSITION_FR: Record<string, string> = {
  "Goalkeeper": "Gardien",
  "Defence": "Défenseur",
  "Midfield": "Milieu",
  "Offence": "Attaquant",
  "Defender": "Défenseur",
  "Midfielder": "Milieu",
  "Forward": "Attaquant",
};

function toFr(en: string): string {
  return EN_TO_FR[en.toLowerCase()] ?? en;
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

  // 1. Récupérer toutes les équipes WC 2026 avec leurs effectifs
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/teams",
    { headers: { "X-Auth-Token": API_KEY }, cache: "no-store" }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    return NextResponse.json({ error: "Erreur API", details: errData }, { status: 502 });
  }

  const data = await res.json();
  const teams = data.teams ?? [];

  if (!teams.length) {
    return NextResponse.json({ error: "Aucune équipe trouvée" }, { status: 404 });
  }

  // 2. Collecter tous les joueurs avec noms d'équipe en français
  const allPlayers: { api_football_id: number; team_name: string; name: string; position: string }[] = [];
  const teamsSummary: string[] = [];

  for (const team of teams) {
    const frName = toFr(team.name ?? team.shortName ?? "");
    const squad = team.squad ?? [];

    teamsSummary.push(`${frName}: ${squad.length} joueurs`);

    for (const player of squad) {
      if (!player.id || !player.name) continue;
      allPlayers.push({
        api_football_id: player.id,
        team_name: frName,
        name: player.name,
        position: POSITION_FR[player.position] ?? player.position ?? "Inconnu",
      });
    }
  }

  if (!allPlayers.length) {
    return NextResponse.json({
      error: "Aucun joueur dans les effectifs",
      teams_count: teams.length,
      teams_sample: teams.slice(0, 3).map((t: any) => ({ name: t.name, squad_length: t.squad?.length ?? 0 })),
    }, { status: 404 });
  }

  // 3. Vider les anciens joueurs et insérer les nouveaux
  await adminSupabase.from("players").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  let inserted = 0;
  let errors = 0;

  // Insérer par lots de 50
  for (let i = 0; i < allPlayers.length; i += 50) {
    const batch = allPlayers.slice(i, i + 50);
    const { error } = await adminSupabase.from("players").insert(batch);
    if (error) {
      errors++;
    } else {
      inserted += batch.length;
    }
  }

  return NextResponse.json({
    success: true,
    teams_count: teams.length,
    players_inserted: inserted,
    errors,
    teams: teamsSummary,
  });
}
