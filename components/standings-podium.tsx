import type { LeagueStanding } from "@/types/database";

interface PodiumProps {
  standings: LeagueStanding[];
}

const PODIUM = [
  { rank: 2, height: "h-24", bg: "bg-gray-200", label: "🥈", textColor: "text-gray-600" },
  { rank: 1, height: "h-32", bg: "bg-gold-light", label: "🥇", textColor: "text-gold" },
  { rank: 3, height: "h-16", bg: "bg-amber-100", label: "🥉", textColor: "text-amber-600" },
];

export function StandingsPodium({ standings }: PodiumProps) {
  if (standings.length === 0) return null;

  const top3 = [standings[1], standings[0], standings[2]]; // ordre visuel: 2e, 1er, 3e

  return (
    <div className="flex items-end justify-center gap-2 mb-8 px-4">
      {PODIUM.map((p, i) => {
        const player = top3[i];
        if (!player) return <div key={p.rank} className="w-24" />;

        return (
          <div key={p.rank} className="flex flex-col items-center gap-2 animate-[fadeInUp_0.5s_ease] w-28">
            {/* Avatar + pseudo */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center text-xl mx-auto mb-1">
                {player.avatar_url ? (
                  <img src={player.avatar_url} alt={player.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  player.username[0].toUpperCase()
                )}
              </div>
              <p className="text-xs font-semibold text-dark truncate max-w-[100px]">{player.username}</p>
              <p className={`text-sm font-bold font-mono ${p.textColor}`}>{player.total_points} pts</p>
            </div>

            {/* Socle du podium */}
            <div className={`w-full ${p.height} ${p.bg} rounded-t-lg flex items-center justify-center text-2xl border border-border`}>
              {p.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
