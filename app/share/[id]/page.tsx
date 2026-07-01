/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const revalidate = 60;

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function ShareLeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, code")
    .eq("id", id)
    .single() as any;

  if (!league) notFound();

  const { data: standings } = await supabase
    .from("league_standings")
    .select("username, total_points, predictions_count")
    .eq("league_id", id)
    .order("total_points", { ascending: false }) as any;

  const list = standings ?? [];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "#0A1628" }}>
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>

          {/* Header */}
          <div style={{ background: "#000", padding: "16px 20px" }} className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-widest" style={{ color: "#555", marginBottom: 2 }}>
                COUPE DU MONDE DE LA FIFA 2026™
              </p>
              <p className="font-bold text-sm text-white">Le Prono du GOAT</p>
            </div>
            <span className="text-2xl">⚽</span>
          </div>

          {/* League name */}
          <div className="px-6 pt-6 pb-4 text-center">
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#F5A623" }}>Classement</p>
            <h1 className="text-white font-bold text-xl leading-tight">{league.name}</h1>
            <p className="text-sm mt-1" style={{ color: "#6b7280" }}>{list.length} participant{list.length > 1 ? "s" : ""}</p>
          </div>

          {/* Standings */}
          <div className="px-4 pb-4">
            {list.length === 0 ? (
              <p className="text-center text-sm py-6" style={{ color: "#4b5563" }}>Aucun pronostic pour l'instant</p>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535" }}>
                {list.map((s: any, i: number) => (
                  <div
                    key={s.username}
                    className="flex items-center justify-between px-4 py-3"
                    style={{
                      borderBottom: i < list.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      background: i === 0 ? "rgba(245,166,35,0.06)" : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-6 text-center">
                        {i < 3 ? MEDALS[i] : <span style={{ color: "#4b5563", fontSize: 13 }}>{i + 1}</span>}
                      </span>
                      <span
                        className="font-semibold text-sm"
                        style={{ color: i === 0 ? "#F5A623" : "#e5e7eb" }}
                      >
                        {s.username}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white text-sm">{s.total_points}</span>
                      <span className="text-xs ml-1" style={{ color: "#6b7280" }}>pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invite CTA */}
          <div className="px-4 pb-6">
            <div className="rounded-xl px-4 py-4 text-center" style={{ background: "#0D1B2E", border: "1px solid rgba(0,61,165,0.3)" }}>
              <p className="text-xs mb-1" style={{ color: "#6b7280" }}>Code d'invitation</p>
              <p className="font-bold text-lg tracking-widest mb-3" style={{ color: "#F5A623" }}>{league.code}</p>
              <a
                href="https://prono-du-goat.vercel.app"
                className="inline-block text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
                style={{ background: "#003DA5" }}
              >
                Rejoindre la ligue →
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 text-center" style={{ background: "rgba(0,0,0,0.4)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[11px]" style={{ color: "#374151" }}>prono-du-goat.vercel.app</p>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#374151" }}>
          Rejoins la ligue sur{" "}
          <a href="https://prono-du-goat.vercel.app" className="underline" style={{ color: "#F5A623" }}>
            prono-du-goat.vercel.app
          </a>
        </p>
      </div>
    </div>
  );
}
