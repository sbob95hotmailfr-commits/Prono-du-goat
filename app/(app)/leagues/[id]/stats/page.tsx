/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { WcNav } from "@/components/wc-nav";
import { CopyCode } from "@/components/copy-code";
import type { LeagueStanding } from "@/types/database";

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: standingsData } = await supabase
    .from("league_standings").select("*").eq("league_id", id)
    .order("total_points", { ascending: false }) as any;
  const standings = (standingsData ?? []) as LeagueStanding[];

  const { data: myPreds } = await supabase
    .from("predictions")
    .select("points_earned, home_score_pred, away_score_pred")
    .eq("user_id", user.id).eq("league_id", id) as any;

  const preds = myPreds ?? [];
  const totalPreds = preds.length;
  const exactPreds = preds.filter((p: any) => p.points_earned === 3).length;
  const goodPreds = preds.filter((p: any) => p.points_earned === 1).length;
  const missedPreds = preds.filter((p: any) => p.points_earned === 0).length;
  const totalPoints = preds.reduce((s: number, p: any) => s + (p.points_earned ?? 0), 0);

  const myRank = standings.findIndex(s => s.user_id === user.id) + 1;
  const isAdmin = (league as any).admin_id === user.id;
  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <WcNav
        leagueId={id}
        leagueName={(league as any).name}
        code={(league as any).code}
        isAdmin={isAdmin}
        activeTab="stats"
      />

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">

        {/* Mes stats */}
        <div className="flex-1 space-y-4">
          <h2 className="font-bold text-[#1A1A1A] text-lg">Mes statistiques</h2>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-[#003DA5]">{totalPoints}</p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Points</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-[#1A1A1A]">{myRank > 0 ? `#${myRank}` : "–"}</p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Rang</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-[#F5A623]">{exactPreds}</p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Scores exacts</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-[#00A650]">{totalPreds}</p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Pronostics</p>
            </div>
          </div>

          {/* Détail */}
          {totalPreds > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-black px-4 py-3">
                <p className="text-xs text-gray-300 uppercase tracking-widest font-semibold">Détail des pronostics</p>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-[#F5A623]">
                    ⭐ Scores exacts (+3pts)
                  </span>
                  <span className="font-bold text-[#1A1A1A]">{exactPreds}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-[#00A650]">
                    ✓ Bons résultats (+1pt)
                  </span>
                  <span className="font-bold text-[#1A1A1A]">{goodPreds}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-[#E8192C]">
                    ✗ Ratés (0pt)
                  </span>
                  <span className="font-bold text-[#1A1A1A]">{missedPreds}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="text-sm font-bold text-[#1A1A1A]">Total</span>
                  <span className="font-bold text-[#003DA5]">{totalPoints} pts</span>
                </div>
              </div>
            </div>
          )}

          {/* Code invitation */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Code d&apos;invitation</p>
            <div className="flex items-center gap-3">
              <CopyCode code={(league as any).code} />
              <p className="text-xs text-gray-500">Partage ce code pour inviter des amis</p>
            </div>
          </div>
        </div>

        {/* Classement complet */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white shadow-sm rounded-xl overflow-hidden">
            <div className="bg-black px-4 py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">FIFA World Cup 2026™</p>
              <p className="font-bold text-white text-sm">Classement général</p>
            </div>

            {/* En-tête tableau */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="col-span-1 text-[10px] text-gray-400">#</span>
              <span className="col-span-8 text-[10px] text-gray-400 uppercase tracking-wide">Joueur</span>
              <span className="col-span-3 text-[10px] text-gray-400 uppercase tracking-wide text-right">Pts</span>
            </div>

            {!standings.length ? (
              <div className="p-6 text-center text-gray-400 text-sm">Aucun point encore</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {standings.map((s, i) => (
                  <div key={s.user_id}
                    className={`grid grid-cols-12 gap-2 items-center px-4 py-3 ${s.user_id === user.id ? "bg-blue-50" : ""}`}>
                    <span className={`col-span-1 text-sm font-bold ${medalColors[i] ?? "text-gray-400"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <div className="col-span-8 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                        {(s.username?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-[#1A1A1A] truncate">
                        {s.username}
                        {s.user_id === user.id && <span className="ml-1 text-[10px] text-[#003DA5]">(moi)</span>}
                      </span>
                    </div>
                    <span className="col-span-3 text-right font-mono font-bold text-[#003DA5]">
                      {s.total_points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
