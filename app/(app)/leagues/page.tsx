/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LeaguesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: memberships } = await supabase
    .from("league_members")
    .select("*, leagues(id, name, code, admin_id)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false }) as any;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark">Mes ligues</h1>
        <Link href="/dashboard" className="text-sm text-muted hover:text-dark">← Dashboard</Link>
      </div>

      <div className="flex gap-3 mb-6">
        <Link href="/leagues/create" className="btn-primary flex-1 text-center text-sm py-2.5">+ Créer une ligue</Link>
        <Link href="/leagues/join" className="btn-secondary flex-1 text-center text-sm py-2.5">Rejoindre via code</Link>
      </div>

      {!(memberships as any[])?.length ? (
        <div className="card p-8 text-center">
          <p className="text-4xl mb-3">🏟️</p>
          <p className="font-semibold text-dark">Aucune ligue pour l&apos;instant</p>
          <p className="text-sm text-muted mt-1">Crée ta ligue ou rejoins celle d&apos;un ami.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(memberships as any[]).map((m: any) => {
            const league = m.leagues;
            return (
              <Link key={m.id} href={`/leagues/${league.id}`}
                className="card p-4 flex items-center justify-between hover:border-primary transition-colors block">
                <div>
                  <p className="font-semibold text-dark">{league.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Code : <span className="font-mono font-bold text-primary">{league.code}</span>
                    {league.admin_id === user.id && <span className="ml-2 text-gold">⭐ Admin</span>}
                  </p>
                </div>
                <span className="text-muted text-lg">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
