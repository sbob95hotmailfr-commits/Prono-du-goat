// Client pour l'API Football (v3.football.api-sports.io)
const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY!;

async function apiFetch(endpoint: string) {
  const res = await fetch(`${API_FOOTBALL_BASE}${endpoint}`, {
    headers: {
      "x-apisports-key": API_KEY,
      "Content-Type": "application/json",
    },
    next: { revalidate: 60 }, // Cache de 60 secondes
  });
  if (!res.ok) throw new Error(`API Football error: ${res.status}`);
  return res.json();
}

// Récupère le score live d'un match via son fixture_id
export async function getLiveFixture(fixtureId: number) {
  const data = await apiFetch(`/fixtures?id=${fixtureId}`);
  const fixture = data.response?.[0];
  if (!fixture) return null;
  return {
    homeScore: fixture.goals.home,
    awayScore: fixture.goals.away,
    minute: fixture.fixture.status.elapsed,
    // FT=terminé, 1H/2H/HT/ET/P=live, NS=à venir
    status: fixture.fixture.status.short as string,
  };
}

// Récupère les meilleurs buteurs de la Coupe du Monde 2026
// League ID FIFA World Cup = 1 (season 2026)
export async function getTopScorers() {
  const data = await apiFetch(`/players/topscorers?league=1&season=2026`);
  return data.response ?? [];
}

// Récupère les stats d'un joueur spécifique
export async function getPlayerStats(playerId: number) {
  const data = await apiFetch(
    `/players?id=${playerId}&league=1&season=2026`
  );
  return data.response?.[0] ?? null;
}
