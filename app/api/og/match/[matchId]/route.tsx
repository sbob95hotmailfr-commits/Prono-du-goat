// @ts-nocheck
// Génère une image OG partageable pour un match
// /api/og/match/[matchId]?leagueId=...&userId=...
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function GET(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const leagueId = req.nextUrl.searchParams.get("leagueId");
  const userId = req.nextUrl.searchParams.get("userId");

  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("home_team, away_team, home_score, away_score, home_flag, away_flag, stage, status")
    .eq("id", matchId)
    .single();

  let predScore: string | null = null;
  let predPoints: number | null = null;
  let username: string | null = null;

  if (leagueId && userId) {
    const { data: pred } = await admin
      .from("predictions")
      .select("home_score_pred, away_score_pred, points_earned")
      .eq("match_id", matchId)
      .eq("league_id", leagueId)
      .eq("user_id", userId)
      .single();

    if (pred) {
      predScore = `${pred.home_score_pred} – ${pred.away_score_pred}`;
      predPoints = pred.points_earned;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();
    username = profile?.username ?? null;
  }

  const finished = match?.status === "finished";
  const scoreText = finished && match?.home_score != null
    ? `${match.home_score} – ${match.away_score}`
    : "VS";

  const pointsLabel =
    predPoints == null ? null :
    predPoints >= 3 ? `⭐ Score exact · +${predPoints} pts` :
    predPoints > 0 ? `✓ Bon résultat · +${predPoints} pt${predPoints > 1 ? "s" : ""}` :
    `✗ Raté · 0 pt`;

  const pointsColor =
    predPoints == null ? "#9ca3af" :
    predPoints >= 3 ? "#F5A623" :
    predPoints > 0 ? "#00A650" :
    "#6b7280";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #0A1628 0%, #0D1B2E 50%, #0A1628 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Cercle déco bg */}
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,61,165,0.15) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Logo header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "40px",
            opacity: 0.8,
          }}
        >
          <span style={{ fontSize: "28px" }}>⚽</span>
          <span style={{ color: "#60a5fa", fontSize: "20px", fontWeight: "700", letterSpacing: "0.05em" }}>
            Le Prono du GOAT
          </span>
        </div>

        {/* Phase */}
        {match?.stage && (
          <div
            style={{
              color: "#6b7280",
              fontSize: "14px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "24px",
            }}
          >
            {match.stage}
          </div>
        )}

        {/* Teams + Score */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "48px",
            marginBottom: "36px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "72px" }}>{match?.home_flag ?? "🏴"}</span>
            <span style={{ color: "white", fontSize: "22px", fontWeight: "700" }}>{match?.home_team ?? ""}</span>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: "16px",
              padding: "20px 40px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span
              style={{
                color: "white",
                fontSize: "64px",
                fontWeight: "900",
                fontFamily: "monospace",
                letterSpacing: "0.1em",
              }}
            >
              {scoreText}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "72px" }}>{match?.away_flag ?? "🏴"}</span>
            <span style={{ color: "white", fontSize: "22px", fontWeight: "700" }}>{match?.away_team ?? ""}</span>
          </div>
        </div>

        {/* Pronostic perso */}
        {predScore && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "20px 48px",
              marginBottom: "16px",
            }}
          >
            <span style={{ color: "#9ca3af", fontSize: "13px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              {username ? `Pronostic de ${username}` : "Mon pronostic"}
            </span>
            <span style={{ color: "#60a5fa", fontSize: "36px", fontWeight: "800", fontFamily: "monospace" }}>
              {predScore}
            </span>
            {pointsLabel && (
              <span style={{ color: pointsColor, fontSize: "18px", fontWeight: "700" }}>
                {pointsLabel}
              </span>
            )}
          </div>
        )}

        {/* WC 2026 badge */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            right: "32px",
            color: "rgba(255,255,255,0.2)",
            fontSize: "13px",
            letterSpacing: "0.1em",
          }}
        >
          FIFA World Cup 2026™
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
