# SPEC — Le Prono du GOAT · Niveau 2

## Règle d'or — Sécurité RLS

**Pour chaque nouvelle table SQL créée, les 4 policies RLS (SELECT, INSERT, UPDATE, DELETE) sont obligatoires.**
Même si une policy est `USING (false)`, elle doit être explicitement déclarée.
Cette règle est non négociable — c'est la leçon principale du bug Niveau 1.

## Nouvelles fonctionnalités

### 1. Pronostic Buteur (+1 point bonus)
- Table `scorer_predictions` liée à `predictions`
- Table `players` avec les joueurs des 48 équipes
- Table `match_scorers` pour les buteurs réels saisis par l'admin
- Calcul du bonus dans `lib/points.ts` → `calculateScorerBonus()`

### 2. Scores Live via API Football
- Table `matches` étendue : `api_football_fixture_id`, `minute`, `last_synced_at`
- `lib/api-football.ts` : client API (v3.football.api-sports.io)
- Cron Vercel : `/api/cron/sync-live-scores` (toutes les minutes)

### 3. Réactions Emoji
- Table `reactions` (match_id, user_id, emoji) avec UNIQUE(match_id, user_id, emoji)
- Component `ReactionsBar` dans chaque match-card
- 5 emojis : 🔥 😱 😂 👏 💀

### 4. Badges
- Table `badges` (catalogue) + `user_badges` (badges obtenus par user)
- 5 badges initiaux : first_blood, perfect_round, top_scorer_hunter, no_fear, loyal_fan
- Logique dans `lib/badges.ts`
- Page `/leagues/[id]/badges`

### 5. Profils IA (Claude)
- Table `ai_profiles` : profil généré par Claude API
- Route `/api/ai/generate-profile` : appel Claude claude-sonnet-4-6
- Page `/profile/ai` : voir + régénérer son profil
- Page publique `/p/[username]` : partageable sans connexion

### 6. Résumé IA de la journée
- Table `daily_summaries`
- Route `/api/ai/generate-summary`

### 7. Emails de rappel (Resend)
- Cron Vercel : `/api/cron/send-reminders` (toutes les 5 minutes)
- Envoi 30 min avant chaque match si prono non encore fait

### 8. Compte à rebours
- Component `Countdown` dans dashboard + page ligue
- Mise à jour temps réel (setInterval)

## Variables d'environnement requises
```
API_FOOTBALL_KEY=...
ANTHROPIC_API_KEY=...
RESEND_API_KEY=...
CRON_SECRET=...  (32+ chars aléatoires)
```

## Architecture technique
- Next.js 14 App Router
- Supabase (PostgreSQL + Auth + RLS)
- createAdminClient() pour toutes les opérations admin/cron (bypasse RLS)
- Vercel Cron Jobs (vercel.json)
