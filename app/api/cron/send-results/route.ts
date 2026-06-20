// @ts-nocheck
// Cron Job : envoie les emails de résultat après chaque match terminé
// S'exécute toutes les 5 minutes — envoie une fois par match fini (via flag notified_at)
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  // Matchs terminés dans les 15 dernières minutes, pas encore notifiés
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_flag, away_flag, home_score, away_score, kickoff_at, stage")
    .eq("status", "finished")
    .gte("kickoff_at", new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()) // matchs des 4 dernières heures
    .is("result_notified_at", null);

  if (!matches?.length) {
    return NextResponse.json({ message: "Aucun résultat à notifier", sent: 0 });
  }

  let sent = 0;

  for (const match of matches) {
    // Récupère les pronostics avec les points gagnés pour ce match
    const { data: predictions } = await supabase
      .from("predictions")
      .select("user_id, home_score_pred, away_score_pred, points_earned, league_id")
      .eq("match_id", match.id)
      .not("points_earned", "is", null);

    if (!predictions?.length) continue;

    const userIds = [...new Set(predictions.map((p) => p.user_id))];
    const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const users = (usersData?.users ?? []).filter((u) => userIds.includes(u.id));

    const userMap = Object.fromEntries(users.map((u) => [u.id, u.email]));

    for (const pred of predictions) {
      const email = userMap[pred.user_id];
      if (!email) continue;

      const pointsLabel =
        pred.points_earned === 3 ? "⭐ Score exact ! +3 points" :
        pred.points_earned === 1 ? "✓ Bon résultat ! +1 point" :
        "✗ Pas de chance — 0 point";
      const pointsColor =
        pred.points_earned === 3 ? "#F5A623" :
        pred.points_earned === 1 ? "#00A650" : "#E8192C";

      try {
        await resend.emails.send({
          from: "Le Prono du GOAT <onboarding@resend.dev>",
          to: email,
          subject: `⚽ Résultat : ${match.home_flag ?? ""} ${match.home_team} ${match.home_score}-${match.away_score} ${match.away_team} ${match.away_flag ?? ""}`,
          html: `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0A1628; padding: 24px; border-radius: 12px;">
              <div style="background: #000; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <p style="color: #999; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px 0;">COUPE DU MONDE DE LA FIFA 2026™</p>
                <p style="color: #fff; font-size: 18px; font-weight: bold; margin: 0;">Le Prono du GOAT</p>
              </div>

              <h2 style="color: #F5A623; font-size: 14px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 2px;">Résultat du match</h2>

              <div style="background: #1A2535; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 16px;">
                <p style="color: #fff; font-size: 26px; font-weight: bold; margin: 0 0 6px 0;">
                  ${match.home_flag ?? ""} ${match.home_team} ${match.home_score} – ${match.away_score} ${match.away_team} ${match.away_flag ?? ""}
                </p>
                <p style="color: #6b7280; font-size: 13px; margin: 0;">${match.stage}</p>
              </div>

              <div style="background: #1A2535; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 16px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase;">Ton pronostic</p>
                <p style="color: #fff; font-size: 22px; font-weight: bold; margin: 0 0 10px 0;">
                  ${pred.home_score_pred} – ${pred.away_score_pred}
                </p>
                <p style="color: ${pointsColor}; font-size: 15px; font-weight: bold; margin: 0;">${pointsLabel}</p>
              </div>

              <a href="https://prono-du-goat.vercel.app/dashboard"
                 style="display: block; background: #003DA5; color: white; padding: 14px;
                        border-radius: 8px; text-decoration: none; font-weight: bold;
                        font-size: 14px; text-align: center;">
                Voir le classement →
              </a>

              <p style="color: #374151; font-size: 11px; margin-top: 24px; text-align: center;">
                Le Prono du GOAT · Coupe du Monde de la FIFA 2026™
              </p>
            </div>
          `,
        });
        sent++;
      } catch (err) {
        console.error(`Erreur email résultat ${email}:`, err);
      }
    }

    // Marque le match comme notifié
    await supabase
      .from("matches")
      .update({ result_notified_at: now.toISOString() })
      .eq("id", match.id);
  }

  return NextResponse.json({ sent, matches: matches.length });
}
