/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BackButton } from "@/components/back-button";

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Mes ligues</h1>
          <BackButton fallback="/dashboard" className="text-xs text-gray-400 hover:text-white border border-gray-600 rounded-lg px-3 py-1.5 transition-colors" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Boutons */}
        <div className="flex gap-3 mb-6">
          <Link href="/leagues/create"
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold text-center py-3 rounded-xl transition-colors shadow">
            + Créer une ligue
          </Link>
          <Link href="/leagues/join"
            className="flex-1 bg-white hover:bg-gray-50 text-green-600 font-bold text-center py-3 rounded-xl border-2 border-green-500 transition-colors">
            Rejoindre via code
          </Link>
        </div>

        {!(memberships as any[])?.length ? (
          <div className="bg-white rounded-xl shadow p-10 text-center">
            <p className="text-5xl mb-3">🏟️</p>
            <p className="font-bold text-gray-800 text-lg">Aucune ligue pour l&apos;instant</p>
            <p className="text-sm text-gray-500 mt-1">Crée ta ligue ou rejoins celle d&apos;un ami.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(memberships as any[]).map((m: any) => {
              const league = m.leagues;
              const isAdmin = league.admin_id === user.id;
              return (
                <Link key={m.id} href={`/leagues/${league.id}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:shadow-md hover:border-green-200 transition-all block">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg">
                      {(league.name?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{league.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">Code :</span>
                        <span className="font-mono text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">{league.code}</span>
                        {isAdmin && <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded font-semibold">⭐ Admin</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-gray-400 text-xl">›</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
