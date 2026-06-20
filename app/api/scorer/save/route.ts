// @ts-nocheck
// Sauvegarde les pronostics buteur (multi-slots)
// Utilise le client admin pour contourner la RLS DELETE (bloquée côté client)
// Vérifie côté serveur que l'utilisateur est bien propriétaire de la prédiction
// et que le match n'a pas encore commencé
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { predictionId, entries } = await req.json();
  if (!predictionId) return NextResponse.json({ error: "predictionId requis" }, { status: 400 });

  const adminSupabase = createAdminClient();

  // Vérifie que la prédiction appartient à l'utilisateur et que le match n'a pas commencé
  const { data: pred } = await adminSupabase
    .from("predictions")
    .select("id, matches(kickoff_at)")
    .eq("id", predictionId)
    .eq("user_id", user.id)
    .single() as any;

  if (!pred) return NextResponse.json({ error: "Prédiction introuvable" }, { status: 404 });

  const kickoff = new Date((pred.matches as any)?.kickoff_at ?? 0);
  if (kickoff <= new Date()) {
    return NextResponse.json({ error: "Match déjà commencé, modification impossible" }, { status: 403 });
  }

  // Supprime les anciens buteurs via le client admin (bypass RLS)
  await adminSupabase
    .from("scorer_predictions")
    .delete()
    .eq("prediction_id", predictionId);

  // Insère les nouveaux (seulement les slots remplis)
  if (Array.isArray(entries) && entries.length > 0) {
    const { error: insertError } = await adminSupabase
      .from("scorer_predictions")
      .insert(entries);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, saved: entries?.length ?? 0 });
}
