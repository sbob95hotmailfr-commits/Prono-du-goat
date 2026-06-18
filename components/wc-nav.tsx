import Link from "next/link";
import Image from "next/image";

interface WcNavProps {
  leagueId: string;
  leagueName: string;
  code?: string;
  isAdmin?: boolean;
  activeTab: "matches" | "classements" | "stats" | "equipes" | "tableau";
}

export function WcNav({ leagueId, leagueName, code, isAdmin, activeTab }: WcNavProps) {
  const tabs = [
    { key: "matches",     label: "Matchs",      href: `/leagues/${leagueId}` },
    { key: "classements", label: "Classements",  href: `/leagues/${leagueId}/groups` },
    { key: "tableau",     label: "Tableau",      href: `/leagues/${leagueId}/bracket` },
    { key: "equipes",     label: "Équipes",      href: `/leagues/${leagueId}/teams` },
    { key: "stats",       label: "Ma ligue",     href: `/leagues/${leagueId}/stats` },
  ] as const;

  return (
    <div className="sticky top-0 z-50">
      {/* Barre noire FIFA */}
      <div className="bg-black px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/leagues" className="text-gray-400 hover:text-white text-sm transition-colors">←</Link>
            <div className="flex items-center gap-2">
              <Image src="/wc2026.png" alt="FIFA WC2026" width={32} height={32} className="shrink-0" />
              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest leading-none">COUPE DU MONDE DE LA FIFA 2026™</p>
                <p className="text-sm font-bold text-white leading-tight">{leagueName}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {code && (
              <span className="text-[10px] text-gray-500 font-mono hidden sm:block">#{code}</span>
            )}
            {isAdmin && (
              <Link href="/admin/matches"
                className="text-[10px] bg-[#F5A623] text-black font-bold px-2 py-1 rounded uppercase tracking-wide">
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm overflow-x-auto">
        <div className="max-w-5xl mx-auto flex min-w-max">
          {tabs.map(tab => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-[#E8192C] text-[#E8192C]"
                  : "border-transparent text-gray-500 hover:text-black"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
