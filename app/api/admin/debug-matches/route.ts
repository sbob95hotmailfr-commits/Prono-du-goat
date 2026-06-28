// @ts-nocheck
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("matches")
    .select("id, home_team, away_team, stage, kickoff_at")
    .in("stage", ["Seizième de finale", "Huitième de finale", "Quart de finale", "Demi-finale", "Finale", "3ème place"])
    .order("kickoff_at");
  return NextResponse.json(data ?? []);
}
