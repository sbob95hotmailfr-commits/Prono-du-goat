"use client";

import Image from "next/image";
import Link from "next/link";

interface Props {
  href: string;
  predicted: boolean;
  size?: number;
}

export function BallBtn({ href, predicted, size = 44 }: Props) {
  return (
    <Link
      href={href}
      title={predicted ? "Voir mon pronostic" : "Faire mon pronostic"}
      className="flex flex-col items-center gap-0.5 group select-none"
      onClick={(e) => predicted && e.preventDefault()}
    >
      <div
        className={predicted ? "ball-frozen" : "ball-beat"}
        style={{ width: size, height: size }}
      >
        <Image
          src="/ball.png"
          alt="Pronostiquer"
          width={size}
          height={size}
          style={{
            mixBlendMode: "multiply",
            objectFit: "contain",
            width: size,
            height: size,
          }}
        />
      </div>
      <span
        className="text-[9px] font-bold uppercase tracking-wide"
        style={{ color: predicted ? "#00A650" : "#F5A623" }}
      >
        {predicted ? "✓ Fait" : "Prono"}
      </span>
    </Link>
  );
}
