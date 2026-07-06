/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/back-button";

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

      const { data: profile } = await supabase
        .from("profiles").select("username").eq("id", user.id).single() as any;
      setUsername(profile?.username ?? "");

      const { data: memberships } = await supabase
        .from("league_members")
        .select("league_id, leagues(id, name)")
        .eq("user_id", user.id).limit(1) as any;

      const firstLeague = memberships?.[0];
      if (firstLeague) {
        const lid = firstLeague.leagues?.id ?? firstLeague.league_id;
        setLeagueId(lid);
        setLeagueName(firstLeague.leagues?.name ?? "");

        const { data: existing } = await supabase
          .from("ai_profiles").select("*")
          .eq("user_id", user.id).eq("league_id", lid).single() as any;
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A1628" }}>
        <p className="text-gray-500 text-sm">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "#0A1628" }}>
      <div className="max-w-md mx-auto space-y-4">

        {/* En-tête */}
        <div className="rounded-xl px-4 py-3" style={{ background: "#0D1B2E" }}>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">COUPE DU MONDE DE LA FIFA 2026™</p>
          <p className="font-bold text-white text-sm">Mon Profil IA</p>
          {leagueName && <p className="text-xs text-gray-500 mt-0.5">{leagueName}</p>}
        </div>

        {error && (
          <div className="rounded-xl p-4" style={{ background: "rgba(232,25,44,0.1)", border: "1px solid rgba(232,25,44,0.25)" }}>
            <p className="text-sm font-medium" style={{ color: "#E8192C" }}>{error}</p>
          </div>
        )}

        {aiProfile ? (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-6 py-8 text-center" style={{ background: "#0D1B2E" }}>
              <p className="text-4xl mb-3">🤖</p>
              <h2 className="font-bold text-2xl leading-tight" style={{ color: "#F5A623" }}>{aiProfile.profile_type}</h2>
              <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">
                Généré le {new Date(aiProfile.generated_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="p-5">
              <p className="text-gray-300 text-sm leading-relaxed">{aiProfile.description}</p>
            </div>
            <div className="p-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={generate}
                disabled={generating}
                className="flex-1 text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af" }}
              >
                {generating ? "Génération…" : "🔄 Actualiser"}
              </button>
              <button
                onClick={share}
                className="flex-1 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                style={{ background: "#003DA5" }}
              >
                {copied ? "✓ Copié !" : "🔗 Partager"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-5xl mb-4">🤖</p>
            <h2 className="font-bold text-white text-lg mb-2">Ton profil IA</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Claude analyse tes pronostics et génère ton profil de pronostiqueur unique.
              Il faut au moins 5 pronostics calculés.
            </p>
            <button
              onClick={generate}
              disabled={generating || !leagueId}
              className="inline-flex items-center justify-center gap-2 text-black font-bold px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: "#F5A623" }}
            >
              {generating ? "Analyse en cours…" : "✨ Générer mon profil IA"}
            </button>
          </div>
        )}

        <BackButton fallback="/dashboard" className="block text-center text-xs text-gray-600 hover:text-gray-400 py-2 transition-colors" />
      </div>
    </div>
  );
}
