/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const revalidate = 60;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("name, code")
    .eq("id", id)
    .single() as any;

  if (!league) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", background: "#0A1628", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "white", fontSize: 48 }}>Le Prono du GOAT</span>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const { data: standings } = await supabase
    .from("league_standings")
    .select("username, total_points")
    .eq("league_id", id)
    .order("total_points", { ascending: false })
    .limit(5) as any;

  const top = (standings ?? []).slice(0, 5);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0A1628",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 48px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#555", fontSize: 14, letterSpacing: 4, textTransform: "uppercase" }}>
            COUPE DU MONDE DE LA FIFA 2026™
          </span>
          <span style={{ color: "white", fontSize: 24, fontWeight: 700, marginTop: 4 }}>
            Le Prono du GOAT
          </span>
        </div>
        <span style={{ fontSize: 56 }}>⚽</span>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 80px",
          gap: 32,
        }}
      >
        {/* League title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#F5A623", fontSize: 18, letterSpacing: 4, textTransform: "uppercase" }}>
            Classement
          </span>
          <span style={{ color: "white", fontSize: 52, fontWeight: 800, textAlign: "center", lineHeight: 1.1 }}>
            {league.name}
          </span>
        </div>

        {/* Standings */}
        {top.length > 0 && (
          <div
            style={{
              background: "#1A2535",
              borderRadius: 20,
              padding: "8px 0",
              width: "100%",
              maxWidth: 700,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {top.map((s: any, i: number) => (
              <div
                key={s.username}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 32px",
                  background: i === 0 ? "rgba(245,166,35,0.08)" : "transparent",
                  borderBottom: i < top.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <span style={{ fontSize: 28, width: 36, textAlign: "center" }}>
                    {i < 3 ? MEDALS[i] : String(i + 1)}
                  </span>
                  <span
                    style={{
                      color: i === 0 ? "#F5A623" : "#e5e7eb",
                      fontSize: 24,
                      fontWeight: 600,
                    }}
                  >
                    {s.username}
                  </span>
                </div>
                <span style={{ color: "white", fontSize: 26, fontWeight: 700 }}>
                  {s.total_points} <span style={{ color: "#6b7280", fontSize: 18 }}>pts</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          background: "#003DA5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px 48px",
        }}
      >
        <span style={{ color: "white", fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>
          prono-du-goat.vercel.app — Code: {league.code}
        </span>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
