// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateLeagueCode } from "@/lib/utils";

export default function CreateLeaguePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const code = generateLeagueCode();

    // Créer la ligue
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .insert({ name: name.trim(), code, admin_id: user.id })
      .select()
      .single();

    if (leagueError) {
      setError(leagueError.message);
      setLoading(false);
      return;
    }

    // Rejoindre automatiquement sa propre ligue
    await supabase
      .from("league_members")
      .insert({ league_id: league.id, user_id: user.id });

    router.push(`/leagues/${league.id}`);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leagues" className="text-muted hover:text-dark">←</Link>
        <h1 className="text-2xl font-bold text-dark">Créer une ligue</h1>
      </div>

      <div className="card p-6">
        {error && (
          <div className="bg-red-50 border border-danger text-danger text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1">
              Nom de la ligue <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Les Pronos de Karim"
              required
              maxLength={50}
              className="w-full border border-border rounded-lg px-4 py-3 text-dark placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="bg-bg rounded-lg p-3 text-sm text-muted">
            Un <strong>code d&apos;invitation unique</strong> sera généré automatiquement pour que tes amis puissent rejoindre ta ligue.
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Création…" : "Créer la ligue"}
          </button>
        </form>
      </div>
    </div>
  );
}
