"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (username.length < 3) {
      setError("Le pseudo doit faire au moins 3 caractères.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message === "User already registered"
        ? "Cet email est déjà utilisé."
        : signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-primary">LE PRONO DU GOAT</h1>
          <p className="text-muted mt-1">Coupe du Monde 2026</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-dark mb-6">Créer un compte</h2>

          {error && (
            <div className="bg-red-50 border border-danger text-danger text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                Pseudo <span className="text-danger">*</span>
              </label>
              <input
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: KarimLeGoat" required minLength={3} maxLength={20}
                className="w-full border border-border rounded-lg px-4 py-3 text-dark placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted mt-1">Visible dans le classement</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                Email <span className="text-danger">*</span>
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com" required
                className="w-full border border-border rounded-lg px-4 py-3 text-dark placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                Mot de passe <span className="text-danger">*</span>
              </label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum" required minLength={8}
                className="w-full border border-border rounded-lg px-4 py-3 text-dark placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? "Création en cours…" : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
