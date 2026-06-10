// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function JoinLeaguePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    // Chercher la ligue par code
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .select("id, name")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (leagueError || !league) {
      setError("Code invalide. Vérifie le code et réessaie.");
      setLoading(false);
      return;
    }

    // Rejoindre la ligue (la contrainte UNIQUE empêche les doublons)
    const { error: joinError } = await supabase
      .from("league_members")
      .insert({ league_id: league.id, user_id: user.id });

    if (joinError) {
      if (joinError.code === "23505") {
        setError("Tu es déjà membre de cette ligue !");
      } else {
        setError("Erreur lors de l'inscription. Réessaie.");
      }
      setLoading(false);
      return;
    }

    router.push(`/leagues/${league.id}`);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leagues" className="text-muted hover:text-dark">←</Link>
        <h1 className="text-2xl font-bold text-dark">Rejoindre une ligue</h1>
      </div>

      <div className="card p-6">
        {error && (
          <div className="bg-red-50 border border-danger text-danger text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1">
              Code d&apos;invitation <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex: GOAT2026"
              required
              maxLength={10}
              className="w-full border border-border rounded-lg px-4 py-3 text-dark font-mono text-lg tracking-widest placeholder:text-muted placeholder:font-sans placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-primary transition-colors text-center uppercase"
            />
            <p className="text-xs text-muted mt-1 text-center">Demande le code à l&apos;admin de la ligue</p>
          </div>

          <button type="submit" disabled={loading || code.length < 4} className="btn-primary w-full">
            {loading ? "Recherche…" : "Rejoindre la ligue"}
          </button>
        </form>
      </div>
    </div>
  );
}
