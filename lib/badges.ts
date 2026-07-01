// @ts-nocheck
// Logique d'attribution des badges — utilise createAdminClient (bypass RLS)
// IMPORTANT: ne pas utiliser createClient() ici (async + cookies, incompatible hors Server Component)
import { createAdminClient } from "@/lib/supabase/server";

const BADGE_RULES: Array<{
  code: string;
  check: (userId: string, leagueId: string) => Promise<boolean>;
}> = [
  {
    code: "first_blood",
    check: async (userId: string, leagueId: string) => {
      const supabase = createAdminClient();
      // Vérifie si cet user est le PREMIER à avoir un score exact dans la ligue
      const { data } = await supabase
        .from("predictions")
        .select("id, user_id")
        .eq("league_id", leagueId)
        .gte("points_earned", 3)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      return data !== null && data.user_id === userId;
    },
  },
  {
    code: "loyal_fan",
    check: async (userId: string, leagueId: string) => {
      const supabase = createAdminClient();
      // Vérifie si l'utilisateur a pronostiqué TOUS les matchs de la phase de groupes
      const { count: totalGroupMatches } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .like("stage", "Groupe%");
      const { count: userPredictions } = await supabase
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("league_id", leagueId);
      return (userPredictions ?? 0) >= (totalGroupMatches ?? 999);
    },
  },
  {
    code: "top_scorer_hunter",
    check: async (userId: string, leagueId: string) => {
      const supabase = createAdminClient();
      // Vérifie si l'utilisateur a 5 buteurs corrects dans cette ligue
      const { data: userPredIds } = await supabase
        .from("predictions")
        .select("id")
        .eq("user_id", userId)
        .eq("league_id", leagueId);

      if (!userPredIds?.length) return false;

      const predIds = userPredIds.map((p) => p.id);

      // Compte les MATCHS distincts où l'utilisateur a trouvé au moins 1 buteur (bonus 1 ou 3)
      const { data: bonusPreds } = await supabase
        .from("scorer_predictions")
        .select("prediction_id")
        .gt("bonus_earned", 0)
        .in("prediction_id", predIds);

      const distinctMatchCount = new Set(bonusPreds?.map((p) => p.prediction_id) ?? []).size;
      return distinctMatchCount >= 5;
    },
  },
];

// Vérifie et attribue tous les badges mérités pour un utilisateur dans une ligue
export async function checkAndAwardBadges(userId: string, leagueId: string) {
  const supabase = createAdminClient();

  for (const rule of BADGE_RULES) {
    try {
      const earned = await rule.check(userId, leagueId);
      if (!earned) continue;

      // Récupère l'ID du badge par son code
      const { data: badge } = await supabase
        .from("badges")
        .select("id")
        .eq("code", rule.code)
        .single();

      if (!badge) continue;

      // Upsert : insère le badge (ignore si déjà obtenu)
      await supabase.from("user_badges").upsert(
        {
          user_id: userId,
          badge_id: badge.id,
          league_id: leagueId,
          earned_at: new Date().toISOString(),
        },
        { onConflict: "user_id,badge_id,league_id" }
      );
    } catch (err) {
      console.error(`Erreur vérification badge "${rule.code}":`, err);
    }
  }
}
