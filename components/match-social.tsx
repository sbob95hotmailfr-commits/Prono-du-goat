"use client";

import { useState, useEffect, useRef } from "react";

const EMOJIS = ["🔥", "😱", "👏", "😤", "🎯"];

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string } | null;
}

interface Reactions {
  [emoji: string]: { count: number; reacted: boolean };
}

interface Props {
  matchId: string;
  leagueId: string;
  currentUserId: string;
}

export function MatchSocial({ matchId, leagueId, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reactions>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAll();
  }, [matchId, leagueId]);

  async function fetchAll() {
    const [cRes, rRes] = await Promise.all([
      fetch(`/api/matches/${matchId}/comments?leagueId=${leagueId}`),
      fetch(`/api/matches/${matchId}/reactions?leagueId=${leagueId}`),
    ]);
    const cData = await cRes.json();
    const rData = await rRes.json();
    setComments(cData.comments ?? []);
    setReactions(rData.reactions ?? {});
  }

  async function toggleReaction(emoji: string) {
    const prev = { ...reactions };
    // Optimistic update
    setReactions((r) => {
      const cur = r[emoji] ?? { count: 0, reacted: false };
      return {
        ...r,
        [emoji]: { count: cur.reacted ? cur.count - 1 : cur.count + 1, reacted: !cur.reacted },
      };
    });
    const res = await fetch(`/api/matches/${matchId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId, emoji }),
    });
    if (!res.ok) setReactions(prev);
  }

  async function sendComment() {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/matches/${matchId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId, content: text.trim() }),
    });
    if (res.ok) {
      const { comment } = await res.json();
      setComments((c) => [...c, comment]);
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSending(false);
  }

  async function deleteComment(id: string) {
    await fetch(`/api/matches/${matchId}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: id }),
    });
    setComments((c) => c.filter((cm) => cm.id !== id));
  }

  function formatTime(iso: string) {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit", minute: "2-digit",
      day: "numeric", month: "short",
      timeZone: "Europe/Paris",
    }).format(new Date(iso));
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#1A2535", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#0D1B2E" }}>
        <span className="text-base">💬</span>
        <span className="font-bold text-white text-sm">Réactions & Commentaires</span>
        {comments.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">{comments.length}</span>
        )}
      </div>

      {/* Réactions */}
      <div className="px-4 pt-4 pb-2 flex gap-2 flex-wrap">
        {EMOJIS.map((emoji) => {
          const r = reactions[emoji];
          const reacted = r?.reacted ?? false;
          const count = r?.count ?? 0;
          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: reacted ? "rgba(245,166,35,0.2)" : "rgba(255,255,255,0.06)",
                border: reacted ? "1px solid rgba(245,166,35,0.4)" : "1px solid rgba(255,255,255,0.1)",
                color: reacted ? "#F5A623" : "#9ca3af",
              }}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-xs">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Commentaires */}
      {comments.length > 0 && (
        <div className="px-4 pt-2 space-y-3 max-h-60 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5"
                style={{ background: "#0D1B2E" }}>
                {(c.profiles?.username?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-white">{c.profiles?.username ?? "?"}</span>
                  <span className="text-[10px] text-gray-600">{formatTime(c.created_at)}</span>
                  {c.user_id === currentUserId && (
                    <button onClick={() => deleteComment(c.id)}
                      className="text-[10px] text-gray-600 hover:text-red-400 ml-auto transition-colors">
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-300 mt-0.5 break-words">{c.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input commentaire */}
      <div className="px-4 py-3 flex gap-2 items-center border-t mt-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendComment()}
          placeholder="Ajoute un commentaire…"
          maxLength={280}
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
        />
        <button
          onClick={sendComment}
          disabled={!text.trim() || sending}
          className="text-sm font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
          style={{ background: "rgba(0,61,165,0.4)", color: "#60a5fa", border: "1px solid rgba(0,61,165,0.4)" }}
        >
          {sending ? "…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
