/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = createAdminClient();

  // Récupère le profil utilisateur par username
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .single() as any;

  if (!profile) notFound();

  // Récupère le profil IA le plus récent
  const { data: aiProfile } = await supabase
    .from("ai_profiles")
    .select("profile_type, description, league_id, generated_at")
    .eq("user_id", profile.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single() as any;

  if (!aiProfile) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🤖</p>
          <p className="text-white font-bold text-lg mb-2">{username}</p>
          <p className="text-gray-400 text-sm">Aucun profil IA généré pour le moment.</p>
          <a href="/" className="mt-6 inline-block text-[#F5A623] text-sm underline">
            Rejoindre Le Prono du GOAT
          </a>
        </div>
      </div>
    );
  }

  // Stats pronostics pour enrichir la carte
  const { data: preds } = await supabase
    .from("predictions")
    .select("points_earned")
    .eq("user_id", profile.id)
    .not("points_earned", "is", null) as any;

  const total = (preds ?? []).length;
  const exact = (preds ?? []).filter((p: any) => p.points_earned === 3).length;
  const exactRate = total > 0 ? Math.round((exact / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Card optimisée pour screenshot */}
        <div className="bg-[#111827] rounded-2xl overflow-hidden shadow-2xl border border-white/10">

          {/* Header */}
          <div className="bg-black px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest">COUPE DU MONDE DE LA FIFA 2026™</p>
              <p className="text-white font-bold text-xs">Le Prono du GOAT</p>
            </div>
            <span className="text-2xl">⚽</span>
          </div>

          {/* Corps principal */}
          <div className="px-6 py-8 text-center">
            {/* Avatar initial */}
            <div className="w-16 h-16 rounded-full bg-[#1E3A5F] flex items-center justify-center mx-auto mb-4 border-2 border-[#F5A623]/30">
              <span className="text-white font-bold text-2xl">
                {username[0]?.toUpperCase() ?? "?"}
              </span>
            </div>

            <p className="text-gray-400 text-sm mb-1">@{username}</p>

            {/* Titre du profil */}
            <h1
              className="font-bold text-[#F5A623] mt-4 mb-4 leading-tight"
              style={{ fontSize: "clamp(20px, 5vw, 28px)" }}
            >
              {aiProfile.profile_type}
            </h1>

            {/* Description */}
            <p className="text-gray-300 text-sm leading-relaxed">
              {aiProfile.description}
            </p>
          </div>

          {/* Stats */}
          {total > 0 && (
            <div className="flex border-t border-white/10">
              <div className="flex-1 py-4 text-center border-r border-white/10">
                <p className="font-bold text-white text-xl">{total}</p>
                <p className="text-gray-500 text-[11px] uppercase tracking-wide mt-0.5">Pronostics</p>
              </div>
              <div className="flex-1 py-4 text-center">
                <p className="font-bold text-[#00A650] text-xl">{exactRate}%</p>
                <p className="text-gray-500 text-[11px] uppercase tracking-wide mt-0.5">Score exact</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-black/50 px-5 py-3 text-center">
            <p className="text-gray-600 text-[11px]">
              prono-du-goat.vercel.app
            </p>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Rejoins la ligue et fais tes pronostics sur{" "}
          <a href="/" className="text-[#F5A623] underline">prono-du-goat.vercel.app</a>
        </p>
      </div>
    </div>
  );
}
