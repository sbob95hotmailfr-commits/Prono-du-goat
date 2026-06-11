export function Trophy() {
  return (
    <svg
      viewBox="0 0 200 260"
      className="h-40 w-auto drop-shadow-[0_0_40px_rgba(217,119,6,0.7)]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Socle bas */}
      <rect x="55" y="230" width="90" height="14" rx="4" fill="#B45309" />
      <rect x="65" y="218" width="70" height="14" rx="3" fill="#D97706" />

      {/* Pied de la coupe */}
      <path d="M85 218 L90 175 L110 175 L115 218 Z" fill="#D97706" />
      <rect x="80" y="172" width="40" height="6" rx="3" fill="#F59E0B" />

      {/* Corps de la coupe */}
      <path
        d="M60 80 Q55 140 75 165 Q90 178 100 178 Q110 178 125 165 Q145 140 140 80 Z"
        fill="url(#goldGradient)"
      />

      {/* Bord supérieur de la coupe */}
      <ellipse cx="100" cy="80" rx="40" ry="10" fill="#FCD34D" />

      {/* Anses gauche */}
      <path
        d="M62 95 Q30 95 28 120 Q26 145 62 140"
        stroke="#D97706" strokeWidth="10" strokeLinecap="round" fill="none"
      />
      {/* Anses droite */}
      <path
        d="M138 95 Q170 95 172 120 Q174 145 138 140"
        stroke="#D97706" strokeWidth="10" strokeLinecap="round" fill="none"
      />

      {/* Globe au sommet */}
      <circle cx="100" cy="55" r="28" fill="url(#globeGradient)" />
      {/* Méridiens du globe */}
      <ellipse cx="100" cy="55" rx="14" ry="28" stroke="#92400E" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <ellipse cx="100" cy="55" rx="28" ry="14" stroke="#92400E" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <line x1="72" y1="55" x2="128" y2="55" stroke="#92400E" strokeWidth="1" opacity="0.4"/>
      <line x1="100" y1="27" x2="100" y2="83" stroke="#92400E" strokeWidth="1" opacity="0.4"/>

      {/* Reflet globe */}
      <ellipse cx="91" cy="44" rx="8" ry="6" fill="white" opacity="0.2" transform="rotate(-20 91 44)"/>

      {/* Deux silhouettes humaines tenant le globe */}
      {/* Figure gauche */}
      <circle cx="84" cy="82" r="4" fill="#92400E" />
      <path d="M80 86 Q84 96 88 86" stroke="#92400E" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M84 90 L82 100 M84 90 L86 100" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Figure droite */}
      <circle cx="116" cy="82" r="4" fill="#92400E" />
      <path d="M112 86 Q116 96 120 86" stroke="#92400E" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M116 90 L114 100 M116 90 L118 100" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round"/>

      {/* Reflet coupe */}
      <path d="M75 90 Q72 130 80 155" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.2"/>

      <defs>
        <linearGradient id="goldGradient" x1="60" y1="80" x2="140" y2="178" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="40%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id="globeGradient" x1="72" y1="27" x2="128" y2="83" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
    </svg>
  );
}
