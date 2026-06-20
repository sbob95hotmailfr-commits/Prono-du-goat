/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name, code, admin_id)")
    .eq("user_id", user.id) as any;

  const leagues = (memberships ?? []).map((m: any) => m.leagues).filter(Boolean);

  // Si 1 seule ligue → redirection directe
  if (leagues.length === 1) {
    redirect(`/leagues/${leagues[0].id}`);
  }

  // Si aucune ligue → page d'onboarding
  if (leagues.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
        style={{ background: "#0D1525" }}>
        <div className="text-5xl mb-4">⚽</div>
        <h1 className="text-white text-2xl font-black mb-2">Bienvenue sur Le Prono du GOAT</h1>
        <p className="text-gray-400 text-sm mb-8 max-w-xs">
          Crée ou rejoins une ligue privée pour commencer à pronostiquer.
        </p>
        <div className="flex gap-4">
          <Link href="/leagues/create"
            className="font-bold px-6 py-3 rounded-xl text-black text-sm"
            style={{ background: "linear-gradient(135deg,#F5A623,#e8912a)" }}>
            Créer une ligue
          </Link>
          <Link href="/leagues/join"
            className="font-bold px-6 py-3 rounded-xl text-white text-sm border border-white/20 hover:bg-white/5 transition-colors">
            Rejoindre
          </Link>
        </div>
      </div>
    );
  }

  // Plusieurs ligues → sélecteur
  const { data: profile } = await supabase
    .from("profiles").select("username").eq("id", user.id).single() as any;

  const standings = await Promise.all(
    leagues.map(async (l: any) => {
      const { data } = await supabase
        .from("league_standings")
        .select("total_points, rank")
        .eq("user_id", user.id)
        .eq("league_id", l.id)
        .single() as any;
      return { leagueId: l.id, pts: data?.total_points ?? 0 };
    })
  );
  const standingMap = Object.fromEntries(standings.map(s => [s.leagueId, s.pts]));

  return (
    <div className="min-h-screen" style={{ background: "#0D1525" }}>
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-5" style={{ background: "#111927" }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">FIFA World Cup 2026™</p>
            <h1 className="text-white font-black text-lg">Bonjour {profile?.username} 👋</h1>
          </div>
          <form action="/auth/signout" method="POST">
            <button type="submit"
              className="text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
              Déconnexion
            </button>
          </form>
        </div>
      </div>

      {/* Liste des ligues */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">Mes ligues</p>
        <div className="space-y-3">
          {leagues.map((l: any) => (
            <Link key={l.id} href={`/leagues/${l.id}`}
              className="flex items-center justify-between rounded-xl px-5 py-4 transition-all hover:scale-[1.01] active:scale-[0.99] group"
              style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                  style={{ background: "#003DA5" }}>
                  {l.name?.[0]?.toUpperCase() ?? "L"}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{l.name}</p>
                  {l.code && <p className="text-gray-500 text-xs font-mono">#{l.code}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-black text-lg leading-none" style={{ color: "#F5A623" }}>
                    {standingMap[l.id]}
                  </p>
                  <p className="text-gray-600 text-[10px]">pts</p>
                </div>
                <span className="text-gray-600 group-hover:text-gray-300 transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Link href="/leagues/create"
            className="flex-1 text-center font-bold py-3 rounded-xl text-black text-sm"
            style={{ background: "linear-gradient(135deg,#F5A623,#e8912a)" }}>
            + Créer une ligue
          </Link>
          <Link href="/leagues/join"
            className="flex-1 text-center font-bold py-3 rounded-xl text-white text-sm border border-white/10 hover:bg-white/5 transition-colors">
            Rejoindre
          </Link>
        </div>
      </div>
    </div>
  );
}
