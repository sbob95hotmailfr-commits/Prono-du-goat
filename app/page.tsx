import Link from "next/link";
import { Trophy } from "@/components/trophy";

export const revalidate = 60;

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Fond texturé terrain de foot */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #16A34A 0px, #16A34A 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #16A34A 0px, #16A34A 1px, transparent 1px, transparent 60px)",
        }}
      />

      {/* Contenu principal */}
      <main className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Trophée FIFA */}
        <div className="mb-4 flex justify-center">
          <Trophy />
        </div>

        {/* Titre principal — Bebas Neue 72px */}
        <h1
          className="font-display text-white leading-none mb-4"
          style={{ fontSize: "clamp(48px, 10vw, 88px)" }}
        >
          LE PRONO DU GOAT
        </h1>

        {/* Sous-titre */}
        <p className="text-gray-300 text-lg md:text-xl mb-6">
          Le concours de pronostics Coupe du Monde 2026
        </p>

        {/* Stats animées */}
        <div className="flex items-center justify-center gap-2 md:gap-4 text-sm md:text-base text-gray-400 mb-10 font-mono flex-wrap">
          <span className="flex items-center gap-1">
            <span className="text-primary font-bold text-lg">48</span> équipes
          </span>
          <span className="text-gray-600">·</span>
          <span className="flex items-center gap-1">
            <span className="text-primary font-bold text-lg">104</span> matchs
          </span>
          <span className="text-gray-600">·</span>
          <span className="flex items-center gap-1">
            <span className="text-primary font-bold text-lg">⚡</span> Classement en temps réel
          </span>
        </div>

        {/* Boutons CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/register"
            className="btn-primary text-base px-8 py-4"
          >
            Créer mon compte
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center bg-transparent border-2 border-white text-white hover:bg-white hover:text-dark font-semibold px-8 py-4 rounded-lg transition-colors duration-200 text-base"
          >
            Se connecter
          </Link>
        </div>

        {/* Accroche */}
        <p className="text-gray-500 text-sm mt-8">
          Rejoins ta ligue privée · Pronostique tous les matchs · Grimpe au classement
        </p>
      </main>

    </div>
  );
}
