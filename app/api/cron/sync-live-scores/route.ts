// @ts-nocheck
// Cron Job : synchronise les scores live toutes les 60 secondes
// Protégé par CRON_SECRET — appel uniquement depuis Vercel Cron ou manuel avec le header
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getLiveFixture } from "@/lib/api-football";
import { calculatePoints } from "@/lib/points";

export async function GET(req: NextRequest) {
  // Sécurité : vérifie le secret du cron
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const in2hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // Récupère les matchs live ou qui commencent dans les 2 heures et ont un fixture_id
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .in("status", ["upcoming", "live"])
    .lte("kickoff_at", in2hours.toISOString())
    .not("api_football_fixture_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!matches?.length) {
    return NextResponse.json({ message: "Aucun match à synchroniser", synced: 0 });
  }

  let synced = 0;

  for (const match of matches) {
    try {
      const live = await getLiveFixture(match.api_football_fixture_id as number);
      if (!live) continue;

      // Détermine le nouveau statut
      let newStatus: "upcoming" | "live" | "finished" = match.status as "upcoming" | "live" | "finished";
      if (live.status === "FT") newStatus = "finished";
      else if (["1H", "2H", "HT", "ET", "P"].includes(live.status)) newStatus = "live";

      // Met à jour le match
      await supabase
        .from("matches")
        .update({
          home_score: live.homeScore,
          away_score: live.awayScore,
          minute: live.minute,
          status: newStatus,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      // Si le match vient de se terminer, calcule les points de tous les pronostics
      if (newStatus === "finished" && match.status !== "finished") {
        const { data: predictions } = await supabase
          .from("predictions")
          .select("id, home_score_pred, away_score_pred")
          .eq("match_id", match.id);

        for (const pred of predictions ?? []) {
          const points = calculatePoints(
            pred.home_score_pred,
            pred.away_score_pred,
            live.homeScore ?? 0,
            live.awayScore ?? 0
          );
          await supabase
            .from("predictions")
            .update({ points_earned: points, is_locked: true })
            .eq("id", pred.id);
        }
      }

      synced++;
    } catch (err) {
      console.error(`Erreur sync match ${match.id}:`, err);
    }
  }

  return NextResponse.json({ synced, total: matches.length });
}
