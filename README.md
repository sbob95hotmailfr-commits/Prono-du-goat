# Le Prono du GOAT

Application web de pronostics pour la Coupe du Monde 2026.
Challenge DEENCODE #02 — Niveau 1.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** (PostgreSQL + Auth + RLS)
- **Tailwind CSS** (design system personnalisé)
- **Vercel** (déploiement)

## Lancement en local

```bash
npm install
npm run dev
```

L'app est disponible sur http://localhost:3000

## Scripts SQL (dans l'ordre, Supabase > SQL Editor)

1. `sql/01_schema.sql` — tables, vue classement, triggers, fonction calcul points
2. `sql/02_rls_policies.sql` — sécurité RLS (verrouillage pronostics inclus)
3. `sql/03_seed_data.sql` — 104 matchs CdM 2026

## Architecture

```
app/
├── (auth)/         ← login & register
├── (app)/          ← routes protégées par middleware
│   ├── dashboard/
│   ├── leagues/    ← liste, créer, rejoindre, [id], [id]/match/[matchId]
│   └── admin/matches
├── auth/           ← callback OAuth & signout
└── page.tsx        ← landing page

components/
├── prediction-form.tsx   ← saisie score, double sécurité verrouillage
├── standings-podium.tsx  ← podium animé top 3
├── bottom-nav.tsx        ← navigation mobile
└── confetti-client.tsx   ← animation score exact

lib/
├── supabase/client.ts    ← client navigateur
├── supabase/server.ts    ← client serveur + admin
├── points.ts             ← calcul points (3/1/0)
└── utils.ts              ← helpers
```

## Sécurité — verrouillage des pronostics

Double couche :
1. **Client** : vérifie `kickoff_at > now()` avant toute requête
2. **Base de données (RLS)** : rejette INSERT/UPDATE si `kickoff_at <= now()` même si le frontend est contourné

## Déploiement Vercel

1. `git push origin main`
2. Connecter le repo sur vercel.com
3. Ajouter les variables d'environnement :

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de ton projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète (serveur uniquement) |
