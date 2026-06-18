/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { WcNav } from "@/components/wc-nav";

const BADGE_HOW_TO: Record<string, string> = {
  first_blood: "Sois le premier de la ligue à faire un score exact",
  perfect_round: "Tous tes pronostics d'une même journée sont corrects",
  top_scorer_hunter: "Pronostique correctement 5 buteurs",
  no_fear: "Pronostique la victoire d'un outsider qui gagne réellement",
  loyal_fan: "Pronostique tous les matchs de la phase de groupes",
};

export default async function BadgesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("league_members").select("*")
    .eq("league_id", id).eq("user_id", user.id).single() as any;
  if (!membership) notFound();

  const { data: league } = await supabase
    .from("leagues").select("*").eq("id", id).single() as any;
  if (!league) notFound();

  const adminSupabase = createAdminClient();
  const isAdmin = (league as any).admin_id === user.id;

  // Charge le catalogue des badges
  const { data: allBadges } = await adminSupabase
    .from("badges")
    .select("*")
    .order("created_at") as any;

  // Charge les badges obtenus par l'utilisateur dans cette ligue
  const { data: userBadges } = await adminSupabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", user.id)
    .eq("league_id", id) as any;

  const earnedMap = Object.fromEntries(
    (userBadges ?? []).map((ub: any) => [ub.badge_id, ub.earned_at])
  );

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <WcNav
        leagueId={id}
        leagueName={(league as any).name}
        code={(league as any).code}
        isAdmin={isAdmin}
        activeTab="stats"
      />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Mes badges</h2>
        <p className="text-sm text-gray-400 mb-6">Déverrouille des badges en progressant dans la ligue</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(allBadges ?? []).map((badge: any) => {
            const earned = badge.id in earnedMap;
            const earnedDate = earnedMap[badge.id];

            return (
              <div
                key={badge.id}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden border transition-all ${
                  earned
                    ? "border-[#F5A623]/40 shadow-[#F5A623]/10"
                    : "border-gray-100 opacity-60"
                }`}
              >
                <div className={`px-5 py-6 text-center ${earned ? "bg-gradient-to-b from-[#F5A623]/10 to-white" : "bg-gray-50"}`}>
                  <span className={`text-5xl block mb-3 ${earned ? "" : "grayscale"}`}>
                    {badge.icon}
                  </span>
                  <h3 className={`font-bold text-base mb-1 ${earned ? "text-[#1A1A1A]" : "text-gray-400"}`}>
                    {badge.name}
                  </h3>
                  <p className={`text-xs leading-relaxed ${earned ? "text-gray-500" : "text-gray-300"}`}>
                    {badge.description}
                  </p>

                  {earned ? (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-[#F5A623]/20 text-[#c07a00] text-[11px] font-bold px-3 py-1 rounded-full">
                      ✓ Obtenu le {new Date(earnedDate).toLocaleDateString("fr-FR")}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <p className="text-[11px] text-gray-400 italic">
                        {BADGE_HOW_TO[badge.code] ?? "Complète des objectifs pour débloquer ce badge"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(!allBadges || allBadges.length === 0) && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-sm">Aucun badge disponible pour le moment.</p>
            <p className="text-xs mt-2">Exécute le script SQL pour initialiser les badges.</p>
          </div>
        )}
      </div>
    </div>
  );
}
