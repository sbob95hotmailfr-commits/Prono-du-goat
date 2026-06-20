# Le Prono du GOAT

Application web de pronostics pour la Coupe du Monde 2026.  
**Challenge DEENCODE #02 — Niveau 2 complet**

## Stack

| Outil | Rôle |
|---|---|
| **Next.js 14** (App Router + TypeScript) | Frontend + API Routes |
| **Supabase** (PostgreSQL + Auth + RLS) | BDD, Auth, Row-Level Security |
| **Claude API** (claude-sonnet-4-6) | Profil IA pronostiqueur + Résumé journée |
| **Resend** | Emails de rappel (30 min avant match) + résultats |
| **API Football v3** | Scores live automatiques |
| **cron-job.org** | Tâches planifiées (scores, rappels, résultats) |
| **Vercel** | Déploiement, CI/CD automatique |
| **Tailwind CSS** | Design system WC2026 (dark theme) |

## Lancement en local

```bash
npm install
npm run dev
```

Copier `.env.local.example` → `.env.local` et renseigner les clés.

## Variables d'environnement

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète (serveur, bypass RLS) |
| `ANTHROPIC_API_KEY` | Claude API (profils IA + résumés) |
| `RESEND_API_KEY` | Emails transactionnels |
| `API_FOOTBALL_KEY` | Scores live API Football v3 |
| `CRON_SECRET` | Secret partagé pour authentifier les crons |

## Scripts SQL (ordre d'exécution, Supabase > SQL Editor)

```
sql/01_schema.sql          ← tables, vue classement, trigger calcul points
sql/02_rls_policies.sql    ← Row-Level Security (verrouillage pronostics)
sql/03_seed_data.sql       ← 104 matchs CdM 2026
sql/04_niveau2_schema.sql  ← réactions, badges, profils IA, résumés, joueurs
sql/05_niveau2_rls.sql     ← RLS pour les nouvelles tables
sql/06_seed_players.sql    ← 240 joueurs CdM 2026 (pronostic buteur)
sql/07_notifications_schema.sql ← colonne result_notified_at
```

## Schéma base de données

```
profiles          ← utilisateurs (username, avatar)
leagues           ← ligues privées (name, code invitation, admin_id)
league_members    ← membres d'une ligue
matches           ← 104 matchs WC2026 (kickoff_at, status, scores)
predictions       ← pronostics (score_pred, points_earned, is_locked)
players           ← 240 joueurs WC2026
scorer_predictions ← pronostic buteur par match
reactions         ← emojis par match (🔥😱😂🧊💀)
badges            ← catalogue 5 badges (first_blood, perfect_round…)
user_badges       ← badges obtenus par utilisateur
ai_profiles       ← profil IA Claude par ligue (profile_type, description)
daily_summaries   ← résumé IA de la journée par ligue
```

## Architecture des routes

```
app/
├── page.tsx                          ← Landing page (prochain match + countdown)
├── (auth)/login|register             ← Auth Supabase
├── (app)/
│   ├── dashboard/                    ← Redirection auto si 1 ligue
│   ├── leagues/
│   │   ├── create/ | join/           ← Créer / rejoindre
│   │   └── [id]/
│   │       ├── page.tsx              ← Hero match + liste matchs + classement
│   │       ├── match/[matchId]/      ← Formulaire pronostic + pronos ligue
│   │       ├── standings/            ← Classement complet
│   │       ├── stats/                ← Stats perso + résumé IA
│   │       ├── badges/               ← Badges & achievements
│   │       ├── teams/                ← Fiches équipes
│   │       ├── bracket/              ← Tableau phases finales
│   │       └── groups/               ← Phase de groupes
│   ├── profile/ai/                   ← Profil IA Claude
│   └── admin/matches/                ← Saisie scores manuels
├── api/
│   ├── ai/generate-profile/          ← Claude → profil pronostiqueur
│   ├── ai/generate-summary/          ← Claude → résumé journée
│   ├── admin/sync-scores/            ← Sync API Football (manuel)
│   ├── admin/score/                  ← Saisie score admin
│   ├── admin/recalculate/            ← Recalcul points
│   └── cron/
│       ├── sync-live-scores/         ← Scores live (toutes les 5 min)
│       ├── send-reminders/           ← Email rappel 30 min avant match
│       └── send-results/             ← Email résultat après match
└── p/[username]/                     ← Profil public partageable
```

## Sécurité — verrouillage des pronostics

Double couche :
1. **Client** : vérifie `kickoff_at > now()` avant toute soumission
2. **RLS PostgreSQL** : rejette INSERT/UPDATE si `kickoff_at <= now()`, même si le client est contourné

## Automatisations (cron-job.org)

| Endpoint | Fréquence | Rôle |
|---|---|---|
| `/api/cron/sync-live-scores` | Toutes les 5 min | Scores live via API Football |
| `/api/cron/send-reminders` | Toutes les 5 min | Email rappel si match dans 30 min |
| `/api/cron/send-results` | Toutes les 5 min | Email résultat après match terminé |

Header requis : `x-cron-secret: <CRON_SECRET>`

## Fonctionnalités Niveau 2

- **Scores live** : synchronisation automatique via API Football (1 date/run pour préserver quota 100 req/jour)
- **Classement auto** : trigger PostgreSQL recalcule les points dès qu'un score est saisi
- **Réactions emoji** : 🔥😱😂🧊💀 par match, en temps réel
- **Badges** : First Blood, Round Parfait, Sans Peur, Fan Loyal, Chasseur de Buteurs
- **Profil IA** : Claude analyse les pronos et génère un archétype (L'Optimiste, Le Sniper…)
- **Résumé IA journée** : Claude commente les résultats du jour (généré par l'admin)
- **Notifications email** : rappel 30 min avant match + résultat après le coup de sifflet
- **Stats avancées** : taux de réussite %, style de prono (optimiste/prudent/équilibré), équipe fétiche
- **Page publique** : `/p/[username]` partageable sur les réseaux
- **Pronostic buteur** : choisir le premier buteur parmi les 240 joueurs WC2026
