/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { WcNav } from "@/components/wc-nav";
import { CopyCode } from "@/components/copy-code";
import { DailySummarySection } from "@/components/daily-summary-section";
import type { LeagueStanding } from "@/types/database";

export const revalidate = 60;

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

  // Pronostics enrichis avec infos match pour stats avancées
  const { data: myPreds } = await supabase
    .from("predictions")
    .select("points_earned, home_score_pred, away_score_pred, matches(home_team, away_team, home_score, away_score)")
    .eq("user_id", user.id).eq("league_id", id) as any;

  const preds = myPreds ?? [];
  const calculatedPreds = preds.filter((p: any) => p.points_earned !== null);
  const totalPreds = preds.length;
  const exactPreds = preds.filter((p: any) => p.points_earned === 3).length;
  const goodPreds = preds.filter((p: any) => p.points_earned === 1).length;
  const missedPreds = preds.filter((p: any) => p.points_earned === 0).length;
  const totalPoints = preds.reduce((s: number, p: any) => s + (p.points_earned ?? 0), 0);
  const tauxReussite = calculatedPreds.length > 0
    ? Math.round(((exactPreds + goodPreds) / calculatedPreds.length) * 100)
    : null;

  // Biais : compare moyenne buts prédits vs réels
  let biais: string | null = null;
  if (calculatedPreds.length >= 3) {
    const avgPred = calculatedPreds.reduce((s: number, p: any) => s + p.home_score_pred + p.away_score_pred, 0) / calculatedPreds.length;
    const avgReal = calculatedPreds.reduce((s: number, p: any) => {
      const m = p.matches;
      return s + (m?.home_score ?? 0) + (m?.away_score ?? 0);
    }, 0) / calculatedPreds.length;
    if (avgPred > avgReal + 0.5) biais = "Optimiste";
    else if (avgPred < avgReal - 0.5) biais = "Prudent";
    else biais = "Équilibré";
  }

  // Équipe fétiche : équipe qui revient le plus dans leurs pronos gagnants
  let equipeFetiche: string | null = null;
  if (calculatedPreds.length >= 3) {
    const teamWins: Record<string, number> = {};
    for (const p of calculatedPreds) {
      const m = p.matches;
      if (!m) continue;
      const predHome = p.home_score_pred;
      const predAway = p.away_score_pred;
      if (predHome > predAway) teamWins[m.home_team] = (teamWins[m.home_team] ?? 0) + 1;
      else if (predAway > predHome) teamWins[m.away_team] = (teamWins[m.away_team] ?? 0) + 1;
    }
    const sorted = Object.entries(teamWins).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && sorted[0][1] >= 2) equipeFetiche = sorted[0][0];
  }

  // Résumé IA du jour
  const adminSupabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const { data: summaryData } = await adminSupabase
    .from("daily_summaries")
    .select("content, summary_date")
    .eq("league_id", id)
    .eq("summary_date", today)
    .single() as any;

  const myRank = standings.findIndex(s => s.user_id === user.id) + 1;
  const isAdmin = (league as any).admin_id === user.id;
  const medalEmoji = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen" style={{ background: "#0A1628" }}>
      <WcNav
        leagueId={id}
        leagueName={(league as any).name}
        code={(league as any).code}
        isAdmin={isAdmin}
        activeTab="stats"
      />

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">

        {/* Colonne gauche : mes stats */}
        <div className="flex-1 space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { val: totalPoints, label: "Points", color: "#003DA5" },
              { val: myRank > 0 ? `#${myRank}` : "–", label: "Rang", color: "#F5A623" },
              { val: exactPreds, label: "Scores exacts", color: "#F5A623" },
              { val: totalPreds, label: "Pronostics", color: "#00A650" },
            ].map(({ val, label, color }) => (
              <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-2xl font-bold" style={{ color }}>{val}</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>

          {/* Stats avancées */}
          {calculatedPreds.length >= 3 && (
            <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="px-4 py-3" style={{ background: "#0D1B2E" }}>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Mon profil de pronostiqueur</p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {tauxReussite !== null && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-300">Taux de réussite</span>
                    <span className="font-bold text-white">{tauxReussite}%</span>
                  </div>
                )}
                {biais && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-300">Style de prono</span>
                    <span className="font-bold" style={{ color: biais === "Optimiste" ? "#F5A623" : biais === "Prudent" ? "#003DA5" : "#00A650" }}>
                      {biais === "Optimiste" ? "⬆️ Optimiste" : biais === "Prudent" ? "⬇️ Prudent" : "⚖️ Équilibré"}
                    </span>
                  </div>
                )}
                {equipeFetiche && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-300">Équipe fétiche</span>
                    <span className="font-bold text-white">⭐ {equipeFetiche}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Détail pronos */}
          {totalPreds > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="px-4 py-3" style={{ background: "#0D1B2E" }}>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Détail des pronostics</p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium" style={{ color: "#F5A623" }}>⭐ Scores exacts (+3pts)</span>
                  <span className="font-bold text-white">{exactPreds}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium" style={{ color: "#00A650" }}>✓ Bons résultats (+1pt)</span>
                  <span className="font-bold text-white">{goodPreds}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium" style={{ color: "#E8192C" }}>✗ Ratés (0pt)</span>
                  <span className="font-bold text-white">{missedPreds}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="font-bold" style={{ color: "#003DA5" }}>{totalPoints} pts</span>
                </div>
              </div>
            </div>
          )}

          {/* Code invitation */}
          <div className="rounded-xl p-4" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Code d&apos;invitation</p>
            <div className="flex items-center gap-3">
              <CopyCode code={(league as any).code} />
              <p className="text-xs text-gray-500">Partage ce code pour inviter des amis</p>
            </div>
          </div>

          {/* Résumé IA du jour */}
          <DailySummarySection
            leagueId={id}
            isAdmin={isAdmin}
            existingSummary={summaryData?.content ?? null}
            summaryDate={summaryData?.summary_date ?? null}
          />
        </div>

        {/* Classement */}
        <div className="lg:w-80 shrink-0">
          <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-4 py-3" style={{ background: "#0D1B2E" }}>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">FIFA World Cup 2026™</p>
              <p className="font-bold text-white text-sm">Classement général</p>
            </div>

            <div className="grid grid-cols-12 gap-2 px-4 py-2" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="col-span-1 text-[10px] text-gray-500">#</span>
              <span className="col-span-8 text-[10px] text-gray-500 uppercase tracking-wide">Joueur</span>
              <span className="col-span-3 text-[10px] text-gray-500 uppercase tracking-wide text-right">Pts</span>
            </div>

            {!standings.length ? (
              <div className="p-6 text-center text-gray-500 text-sm">Aucun point encore</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {standings.map((s, i) => (
                  <div key={s.user_id}
                    className="grid grid-cols-12 gap-2 items-center px-4 py-3"
                    style={s.user_id === user.id ? { background: "rgba(0,61,165,0.12)" } : {}}>
                    <span className="col-span-1 text-sm font-bold text-gray-400">
                      {i < 3 ? medalEmoji[i] : i + 1}
                    </span>
                    <div className="col-span-8 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0" style={{ background: "#0D1B2E" }}>
                        {(s.username?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white truncate">
                        {s.username}
                        {s.user_id === user.id && <span className="ml-1 text-[10px]" style={{ color: "#003DA5" }}>(moi)</span>}
                      </span>
                    </div>
                    <span className="col-span-3 text-right font-mono font-bold" style={{ color: "#F5A623" }}>
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
