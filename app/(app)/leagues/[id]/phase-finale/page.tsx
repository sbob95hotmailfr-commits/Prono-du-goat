import Link from "next/link";
import { WcNav } from "@/components/wc-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";

export default async function PhaseFinaleePage({ params }: { params: Promise<{ id: string }> }) {
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

  const isAdmin = league.admin_id === user.id;

  return (
    <div className="min-h-screen" style={{ background: "#0D1525" }}>
      <WcNav
        leagueId={id}
        leagueName={league.name}
        code={league.code}
        isAdmin={isAdmin}
        activeTab="matches"
      />

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#F5A623" }}>Nouveautés</p>
          <h1 className="text-3xl font-black text-white mb-3">Bonus Phase Finale</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            À partir des quarts de finale, de nouveaux bonus entrent en jeu.<br />
            Tout le monde peut encore gagner.
          </p>
        </div>

        <div className="flex flex-col gap-5">

          {/* Bonus 1 */}
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "#111927" }}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="font-black text-white">Multiplicateur Relance</p>
                <p className="text-xs text-gray-400">Score & buteurs multipliés selon ta position</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Plus tu es loin du podium, plus tes points valent cher. Chaque bon pronostic peut tout changer.
              </p>
              <div className="rounded-xl overflow-hidden border border-white/5">
                <div className="grid grid-cols-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 px-4 py-2" style={{ background: "#0D1525" }}>
                  <span>Position</span>
                  <span className="text-center">Multiplicateur</span>
                  <span className="text-right">Exemple (3 pts)</span>
                </div>
                {[
                  { pos: "🥇 Top 3", mult: "×1", result: "3 pts", color: "#9CA3AF" },
                  { pos: "4e – 6e", mult: "×1.5", result: "4.5 pts", color: "#F5A623" },
                  { pos: "7e et +", mult: "×2", result: "6 pts", color: "#E8192C" },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-3 px-4 py-3 border-t border-white/5 items-center">
                    <span className="text-white text-xs font-semibold">{row.pos}</span>
                    <span className="text-center text-sm font-black" style={{ color: row.color }}>{row.mult}</span>
                    <span className="text-right text-xs font-bold" style={{ color: row.color }}>{row.result}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-[11px] mt-3">
                * La position est calculée au classement de ta ligue au début de chaque tour.
              </p>
            </div>
          </div>

          {/* Bonus 2 */}
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "#111927" }}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
              <span className="text-2xl">⚽</span>
              <div>
                <p className="font-black text-white">Buteurs Multipliés</p>
                <p className="text-xs text-gray-400">Les bonus buteurs suivent le même multiplicateur</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-gray-300 text-sm leading-relaxed">
                Ton multiplicateur de relance s'applique aussi aux points buteurs. Bien pronostiquer un buteur en phase finale peut valoir jusqu'à <span className="font-bold text-white">2× les points habituels</span>.
              </p>
              <div className="mt-4 rounded-xl px-4 py-3 border border-white/5 flex items-center gap-3" style={{ background: "#0D1525" }}>
                <span className="text-xl">🔥</span>
                <p className="text-xs text-gray-300">
                  Exemple : tu pronostics Mbappé buteur (normalement +1 pt) et tu es 8e du classement →
                  <span className="font-bold text-white"> +2 pts</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bonus 3 */}
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "#111927" }}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="font-black text-white">Pronostic Courageux</p>
                <p className="text-xs text-gray-400">Seul contre tous — et tu avais raison</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Si tu es le <span className="font-bold text-white">seul joueur de ta ligue</span> à avoir pronostiqué un résultat différent des autres, et que tu as raison — tu décroches un bonus exceptionnel.
              </p>
              <div className="rounded-xl overflow-hidden border border-white/5">
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Seul à avoir le bon vainqueur</span>
                  <span className="font-black text-sm" style={{ color: "#F5A623" }}>+5 pts</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Seul à avoir le score exact</span>
                  <span className="font-black text-sm" style={{ color: "#E8192C" }}>+8 pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bonus 4 */}
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "#111927" }}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
              <span className="text-2xl">🔮</span>
              <div>
                <p className="font-black text-white">Pronostic Spécial Final</p>
                <p className="text-xs text-gray-400">Prédit le tableau, gagne gros</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                À la fin des 8èmes de finale, chaque joueur fait un pronostic unique : qui seront les 4 demi-finalistes et le vainqueur de la Coupe du Monde ?
              </p>
              <div className="rounded-xl overflow-hidden border border-white/5">
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Par demi-finaliste correct</span>
                  <span className="font-black text-sm" style={{ color: "#F5A623" }}>+3 pts</span>
                </div>
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Finalistes corrects (les 2)</span>
                  <span className="font-black text-sm" style={{ color: "#F5A623" }}>+5 pts</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Vainqueur correct</span>
                  <span className="font-black text-sm" style={{ color: "#E8192C" }}>+10 pts</span>
                </div>
              </div>
              <p className="text-gray-500 text-[11px] mt-3">
                * Ce pronostic ne sera disponible qu'après le dernier match des 8èmes de finale.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-xs mb-4">Ces bonus seront activés automatiquement au bon moment.</p>
          <BackButton fallback={`/leagues/${id}`}
            className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full border border-white/10 text-white hover:border-white/20 transition-colors" />
        </div>

      </div>
    </div>
  );
}
