// @ts-nocheck
export const dynamic = "force-dynamic";
// Cron Job : envoie les emails de rappel 30 min avant chaque match
// S'exécute toutes les 5 minutes — vérifie les matchs dans la fenêtre 25-35 min
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function GET(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const in25min = new Date(now.getTime() + 25 * 60 * 1000);
  const in35min = new Date(now.getTime() + 35 * 60 * 1000);

  // Matchs qui commencent dans 25 à 35 minutes
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_flag, away_flag, kickoff_at, stage")
    .eq("status", "upcoming")
    .gte("kickoff_at", in25min.toISOString())
    .lte("kickoff_at", in35min.toISOString());

  if (!matches?.length) {
    return NextResponse.json({ message: "Aucun rappel à envoyer", sent: 0 });
  }

  let sent = 0;

  for (const match of matches) {
    // Récupère tous les membres des ligues via league_members
    const { data: members } = await supabase
      .from("league_members")
      .select("user_id");

    if (!members?.length) continue;

    // Récupère les IDs uniques des utilisateurs membres d'une ligue
    const userIds = Array.from(new Set(members.map((m) => m.user_id)));

    // Récupère les emails via auth.admin (service role requis)
    const { data: usersData } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    const users = (usersData?.users ?? []).filter((u) =>
      userIds.includes(u.id)
    );

    const kickoffLocal = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    }).format(new Date(match.kickoff_at));

    for (const user of users) {
      if (!user.email) continue;

      // Vérifie si l'utilisateur n'a pas encore pronostiqué ce match
      const { count } = await supabase
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("match_id", match.id);

      // N'envoie le rappel que si l'utilisateur n'a pas encore pronostiqué
      if ((count ?? 0) > 0) continue;

      try {
        await resend.emails.send({
          from: "Le Prono du GOAT <onboarding@resend.dev>",
          to: user.email,
          subject: `⚽ Match dans 30 min : ${match.home_flag ?? ""} ${match.home_team} vs ${match.away_team} ${match.away_flag ?? ""}`,
          html: `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #F7F7F7; padding: 24px; border-radius: 12px;">
              <div style="background: #000; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <p style="color: #999; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px 0;">COUPE DU MONDE DE LA FIFA 2026™</p>
                <p style="color: #fff; font-size: 18px; font-weight: bold; margin: 0;">Le Prono du GOAT</p>
              </div>

              <h2 style="color: #E8192C; font-size: 16px; margin: 0 0 16px 0;">⏰ Match dans 30 minutes !</h2>

              <div style="background: #fff; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
                <p style="font-size: 22px; font-weight: bold; margin: 0 0 8px 0;">
                  ${match.home_flag ?? ""} ${match.home_team}
                  <span style="color: #999; margin: 0 8px;">vs</span>
                  ${match.away_team} ${match.away_flag ?? ""}
                </p>
                <p style="color: #666; font-size: 14px; margin: 0;">${match.stage} · ${kickoffLocal}</p>
              </div>

              <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
                Tu n'as pas encore pronostiqué ce match. Il te reste moins de 30 minutes !
              </p>

              <a href="https://prono-du-goat.vercel.app/dashboard"
                 style="display: inline-block; background: #003DA5; color: white;
                        padding: 14px 28px; border-radius: 8px; text-decoration: none;
                        font-weight: bold; font-size: 15px;">
                Pronostiquer maintenant →
              </a>

              <p style="color: #aaa; font-size: 11px; margin-top: 24px; text-align: center;">
                Le Prono du GOAT · Coupe du Monde de la FIFA 2026™
              </p>
            </div>
          `,
        });
        sent++;
      } catch (err) {
        console.error(`Erreur email ${user.email}:`, err);
      }
    }
  }

  return NextResponse.json({ sent, matches: matches.length });
}
