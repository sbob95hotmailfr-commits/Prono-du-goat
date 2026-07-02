/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { KickMemberBtn } from "@/components/kick-member-btn";

export const revalidate = 0;

export default async function LeagueAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, code, admin_id")
    .eq("id", id)
    .single() as any;

  if (!league || league.admin_id !== user.id) notFound();

  const admin = createAdminClient();

  // Members
  const { data: members } = await admin
    .from("league_members")
    .select("user_id, joined_at")
    .eq("league_id", id) as any;

  const userIds = (members ?? []).map((m: any) => m.user_id);
  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", userIds) as any;
    profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.username]));
  }

  // Points per member
  const { data: standings } = await admin
    .from("league_standings")
    .select("user_id, total_points, predictions_count")
    .eq("league_id", id) as any;
  const pointsMap: Record<string, { total_points: number; predictions_count: number }> = Object.fromEntries(
    (standings ?? []).map((s: any) => [s.user_id, s])
  );

  const memberList = (members ?? []).map((m: any) => ({
    ...m,
    username: profileMap[m.user_id] ?? "Inconnu",
    total_points: pointsMap[m.user_id]?.total_points ?? 0,
    predictions_count: pointsMap[m.user_id]?.predictions_count ?? 0,
    isAdmin: m.user_id === league.admin_id,
  })).sort((a: any, b: any) => b.total_points - a.total_points);

  return (
    <div className="min-h-screen" style={{ background: "#0A1628" }}>
      {/* Header */}
      <div style={{ background: "#000" }} className="px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: "#555" }}>Admin ligue</p>
            <p className="font-bold text-white text-sm">{league.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/leagues/${id}`} className="text-xs text-gray-500 hover:text-white transition-colors">
              ← Retour
            </Link>
            <Link href="/admin" className="text-xs text-gray-500 hover:text-white transition-colors">
              Hub admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* League info */}
        <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p className="text-sm text-gray-400">Code d'invitation</p>
            <p className="font-mono font-bold text-white text-xl tracking-widest mt-0.5">{league.code}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Membres</p>
            <p className="font-bold text-white text-xl">{memberList.length}</p>
          </div>
        </div>

        {/* Members management */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-4 py-3" style={{ background: "#0D1B2E" }}>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Membres</p>
          </div>

          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {memberList.map((m: any) => (
              <div key={m.user_id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: "#0D1B2E" }}>
                    {(m.username?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {m.username}
                      {m.isAdmin && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(245,166,35,0.2)", color: "#F5A623" }}>
                          Admin
                        </span>
                      )}
                      {m.user_id === user.id && (
                        <span className="ml-1 text-[10px]" style={{ color: "#6b7280" }}>(moi)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{m.predictions_count} pronos · {m.total_points} pts</p>
                  </div>
                </div>
                {!m.isAdmin && m.user_id !== user.id && (
                  <KickMemberBtn leagueId={id} userId={m.user_id} username={m.username} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Règles de la ligue */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-4 py-3" style={{ background: "#0D1B2E" }}>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Règles des points</p>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {[
              { label: "Score exact", value: "3 points" },
              { label: "Bon résultat (victoire/nul)", value: "1 point" },
              { label: "Résultat raté", value: "0 point" },
              { label: "Buteur exact (+1 par buteur)", value: "Bonus +1 pt" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-300">{label}</span>
                <span className="text-sm font-bold text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
