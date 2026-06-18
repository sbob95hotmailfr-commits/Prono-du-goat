// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const EMOJIS = ["🔥", "😱", "😂", "👏", "💀"] as const;

interface ReactionCount {
  emoji: string;
  count: number;
  reacted: boolean;
}

export function ReactionsBar({ matchId }: { matchId: string }) {
  const [reactions, setReactions] = useState<ReactionCount[]>(
    EMOJIS.map((e) => ({ emoji: e, count: 0, reacted: false }))
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setUserId(uid);

      // Charge les réactions du match
      const { data } = await supabase
        .from("reactions")
        .select("emoji, user_id")
        .eq("match_id", matchId);

      if (!data) return;

      const updated = EMOJIS.map((emoji) => ({
        emoji,
        count: data.filter((r) => r.emoji === emoji).length,
        reacted: uid ? data.some((r) => r.emoji === emoji && r.user_id === uid) : false,
      }));
      setReactions(updated);
    }

    load();
  }, [matchId]);

  async function toggle(emoji: string) {
    if (!userId || loading) return;
    setLoading(true);

    const supabase = createClient();
    const current = reactions.find((r) => r.emoji === emoji);

    if (current?.reacted) {
      // Supprimer la réaction
      await supabase
        .from("reactions")
        .delete()
        .eq("match_id", matchId)
        .eq("user_id", userId)
        .eq("emoji", emoji);
    } else {
      // Ajouter la réaction
      await supabase
        .from("reactions")
        .insert({ match_id: matchId, user_id: userId, emoji });
    }

    // Mise à jour optimiste
    setReactions((prev) =>
      prev.map((r) =>
        r.emoji === emoji
          ? {
              ...r,
              count: r.reacted ? r.count - 1 : r.count + 1,
              reacted: !r.reacted,
            }
          : r
      )
    );

    setLoading(false);
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-50 flex-wrap">
      {reactions.map(({ emoji, count, reacted }) => (
        <button
          key={emoji}
          onClick={() => toggle(emoji)}
          disabled={!userId || loading}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all
            ${reacted
              ? "bg-[#003DA5]/10 text-[#003DA5] border border-[#003DA5]/30"
              : "bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200"
            } ${!userId ? "cursor-default" : "cursor-pointer"}`}
        >
          <span className="text-sm">{emoji}</span>
          {count > 0 && <span>{count}</span>}
        </button>
      ))}
    </div>
  );
}
