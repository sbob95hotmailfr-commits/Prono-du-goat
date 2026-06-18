/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AiProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState<string>("");
  const [aiProfile, setAiProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Récupère le profil utilisateur
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single() as any;
      setUsername(profile?.username ?? "");

      // Récupère la première ligue de l'utilisateur
      const { data: memberships } = await supabase
        .from("league_members")
        .select("league_id, leagues(id, name)")
        .eq("user_id", user.id)
        .limit(1) as any;

      const firstLeague = memberships?.[0];
      if (firstLeague) {
        const lid = firstLeague.leagues?.id ?? firstLeague.league_id;
        setLeagueId(lid);
        setLeagueName(firstLeague.leagues?.name ?? "");

        // Cherche le profil IA existant
        const { data: existing } = await supabase
          .from("ai_profiles")
          .select("*")
          .eq("user_id", user.id)
          .eq("league_id", lid)
          .single() as any;
        setAiProfile(existing);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function generate() {
    if (!userId || !leagueId) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, leagueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      setAiProfile({ ...data, generated_at: new Date().toISOString() });
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  }

  function share() {
    const url = `${window.location.origin}/p/${username}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] px-4 py-8">
      <div className="max-w-md mx-auto space-y-4">

        {/* En-tête */}
        <div className="bg-black rounded-xl px-4 py-3">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest">COUPE DU MONDE DE LA FIFA 2026™</p>
          <p className="font-bold text-white text-sm">Mon Profil IA</p>
          {leagueName && <p className="text-xs text-gray-500 mt-0.5">{leagueName}</p>}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-[#E8192C] text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Profil IA existant */}
        {aiProfile ? (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="bg-[#0D1B2E] px-6 py-8 text-center">
              <p className="text-4xl mb-3">🤖</p>
              <h2 className="font-bold text-[#F5A623] text-2xl leading-tight">{aiProfile.profile_type}</h2>
              <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">
                Généré le {new Date(aiProfile.generated_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="p-5">
              <p className="text-[#1A1A1A] text-sm leading-relaxed">{aiProfile.description}</p>
            </div>
            <div className="border-t border-gray-100 p-4 flex gap-3">
              <button
                onClick={generate}
                disabled={generating}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {generating ? "Génération…" : "🔄 Actualiser"}
              </button>
              <button
                onClick={share}
                className="flex-1 bg-[#003DA5] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#002d7a] transition-colors"
              >
                {copied ? "✓ Copié !" : "🔗 Partager"}
              </button>
            </div>
          </div>
        ) : (
          /* Pas encore de profil */
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-5xl mb-4">🤖</p>
            <h2 className="font-bold text-[#0D1B2E] text-lg mb-2">Ton profil IA</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Claude analyse tes pronostics et génère ton profil de pronostiqueur unique.
              Il faut au moins 5 pronostics calculés.
            </p>
            <button
              onClick={generate}
              disabled={generating || !leagueId}
              className="flex items-center justify-center gap-2 mx-auto bg-[#003DA5] hover:bg-[#002d7a]
                         disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition-colors"
            >
              {generating ? "Analyse en cours…" : "✨ Générer mon profil IA"}
            </button>
          </div>
        )}

        <a href="/dashboard" className="block text-center text-xs text-gray-400 hover:text-gray-600 py-2">
          ← Retour au tableau de bord
        </a>
      </div>
    </div>
  );
}
