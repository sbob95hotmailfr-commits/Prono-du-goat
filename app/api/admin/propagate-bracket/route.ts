// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const NEXT_STAGE: Record<string, string> = {
  "Seizièmes de finale": "Huitièmes de finale",
  "Huitièmes de finale": "Quarts de finale",
  "Quarts de finale": "Demi-finales",
  "Demi-finales": "Finale",
};
const PLACEHOLDER_PREFIX: Record<string, string> = {
  "Seizièmes de finale": "HF",
  "Huitièmes de finale": "QF",
  "Quarts de finale": "DF",
  "Demi-finales": "F",
};
// Perdants des demi-finales → 3ème place
const LOSER_STAGE: Partial<Record<string, string>> = {
  "Demi-finales": "3ème place",
};
const LOSER_PLACEHOLDER_PREFIX: Partial<Record<string, string>> = {
  "Demi-finales": "Perdant DF",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();

  // Vérifier admin
  const { data: adminLeague } = await admin
    .from("leagues").select("id").eq("admin_id", user.id).limit(1).single();
  if (!adminLeague) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const results: any[] = [];

  for (const [stage, nextStage] of Object.entries(NEXT_STAGE)) {
    const prefix = PLACEHOLDER_PREFIX[stage];

    // Tous les matchs terminés de ce stade, triés par kickoff
    const { data: stageMatches } = await admin
      .from("matches")
      .select("id, home_team, away_team, home_flag, away_flag, home_score, away_score, penalty_winner, kickoff_at")
      .eq("stage", stage)
      .eq("status", "finished")
      .order("kickoff_at", { ascending: true });

    for (let i = 0; i < (stageMatches ?? []).length; i++) {
      const m = stageMatches![i];
      const slot = i + 1;
      const placeholder = `Vainqueur ${prefix}${slot}`;

      // Déterminer le vainqueur
      const isHomeWin =
        m.penalty_winner === "home" ||
        (!m.penalty_winner && (m.home_score ?? 0) > (m.away_score ?? 0));
      const winner = isHomeWin ? m.home_team : m.away_team;
      const winnerFlag = isHomeWin ? m.home_flag : m.away_flag;

      if (!winner || winner.startsWith("Vainqueur")) continue;

      // Mettre à jour le match suivant si le placeholder est encore présent
      const { data: updated1 } = await admin
        .from("matches")
        .update({ home_team: winner, home_flag: winnerFlag ?? "🏳️" })
        .eq("stage", nextStage)
        .eq("home_team", placeholder)
        .select("id");

      const { data: updated2 } = await admin
        .from("matches")
        .update({ away_team: winner, away_flag: winnerFlag ?? "🏳️" })
        .eq("stage", nextStage)
        .eq("away_team", placeholder)
        .select("id");

      if ((updated1?.length ?? 0) + (updated2?.length ?? 0) > 0) {
        results.push({ stage, slot, placeholder, winner });
      }

      // Propagation du perdant (ex: Demi-finales → 3ème place)
      const loserStage = LOSER_STAGE[stage];
      const loserPrefix = LOSER_PLACEHOLDER_PREFIX[stage];
      if (loserStage && loserPrefix) {
        const loser = isHomeWin ? m.away_team : m.home_team;
        const loserFlag = isHomeWin ? m.away_flag : m.home_flag;
        const loserPlaceholder = `${loserPrefix}${slot}`;

        if (loser && !loser.startsWith("Perdant") && !loser.startsWith("Vainqueur")) {
          const { data: lu1 } = await admin
            .from("matches")
            .update({ home_team: loser, home_flag: loserFlag ?? "🏳️" })
            .eq("stage", loserStage)
            .eq("home_team", loserPlaceholder)
            .select("id");

          const { data: lu2 } = await admin
            .from("matches")
            .update({ away_team: loser, away_flag: loserFlag ?? "🏳️" })
            .eq("stage", loserStage)
            .eq("away_team", loserPlaceholder)
            .select("id");

          if ((lu1?.length ?? 0) + (lu2?.length ?? 0) > 0) {
            results.push({ stage, slot, placeholder: loserPlaceholder, loser });
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true, propagated: results });
}
