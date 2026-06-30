// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Auth via server client (cookies)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { matchId, leagueId, homeScore, awayScore } = body;

  if (!matchId || !leagueId || homeScore == null || awayScore == null) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Vérifier que le match n'a pas commencé (côté serveur, source de vérité)
  const { data: match } = await adminSupabase
    .from("matches")
    .select("kickoff_at, status")
    .eq("id", matchId)
    .single();

  if (!match) return NextResponse.json({ error: "Match introuvable" }, { status: 404 });

  if (new Date(match.kickoff_at) <= new Date()) {
    return NextResponse.json({ error: "Ce match a déjà commencé" }, { status: 403 });
  }

  // Vérifier que l'utilisateur est membre de la ligue
  const { data: membership } = await adminSupabase
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "Tu n'es pas membre de cette ligue" }, { status: 403 });

  // Upsert : crée ou met à jour le pronostic (admin client = pas de RLS timing)
  const { data: prediction, error } = await adminSupabase
    .from("predictions")
    .upsert(
      {
        user_id: user.id,
        match_id: matchId,
        league_id: leagueId,
        home_score_pred: Number(homeScore),
        away_score_pred: Number(awayScore),
        is_locked: false,
      },
      { onConflict: "user_id,match_id,league_id" }
    )
    .select("id, home_score_pred, away_score_pred")
    .single();

  if (error || !prediction) {
    return NextResponse.json({ error: "Erreur enregistrement : " + error?.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, prediction });
}
