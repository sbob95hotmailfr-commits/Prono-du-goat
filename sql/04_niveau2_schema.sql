-- ============================================
-- NIVEAU 2 — Nouvelles tables
-- À exécuter dans Supabase > SQL Editor
-- APRÈS les scripts 01, 02, 03 du Niveau 1
-- ============================================

-- 1. Modification de la table matches existante
ALTER TABLE matches ADD COLUMN IF NOT EXISTS api_football_fixture_id integer UNIQUE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS minute integer;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_synced_at timestamp;

-- 2. Table players (joueurs)
CREATE TABLE IF NOT EXISTS players (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_football_id integer UNIQUE NOT NULL,
  team_name       text NOT NULL,
  name            text NOT NULL,
  photo_url       text,
  position        text,
  created_at      timestamp DEFAULT now()
);
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- 3. Table player_stats (statistiques joueurs)
CREATE TABLE IF NOT EXISTS player_stats (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid references players(id) ON DELETE CASCADE,
  goals           integer DEFAULT 0,
  assists         integer DEFAULT 0,
  matches_played  integer DEFAULT 0,
  yellow_cards    integer DEFAULT 0,
  red_cards       integer DEFAULT 0,
  updated_at      timestamp DEFAULT now(),
  UNIQUE(player_id)
);
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- 4. Table scorer_predictions (pronostic buteur)
CREATE TABLE IF NOT EXISTS scorer_predictions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id   uuid references predictions(id) ON DELETE CASCADE,
  player_id       uuid references players(id),
  bonus_earned    integer DEFAULT 0,
  created_at      timestamp DEFAULT now(),
  UNIQUE(prediction_id)
);
ALTER TABLE scorer_predictions ENABLE ROW LEVEL SECURITY;

-- 5. Table match_scorers (buteurs réels saisis par l'admin)
CREATE TABLE IF NOT EXISTS match_scorers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        uuid references matches(id) ON DELETE CASCADE,
  player_id       uuid references players(id),
  minute          integer,
  created_at      timestamp DEFAULT now()
);
ALTER TABLE match_scorers ENABLE ROW LEVEL SECURITY;

-- 6. Table reactions (réactions emoji par match)
CREATE TABLE IF NOT EXISTS reactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        uuid references matches(id) ON DELETE CASCADE,
  user_id         uuid references profiles(id) ON DELETE CASCADE,
  emoji           text NOT NULL,
  created_at      timestamp DEFAULT now(),
  UNIQUE(match_id, user_id, emoji)
);
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- 7. Table badges (catalogue des badges)
CREATE TABLE IF NOT EXISTS badges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  name            text NOT NULL,
  description     text NOT NULL,
  icon            text NOT NULL,
  created_at      timestamp DEFAULT now()
);
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- 8. Table user_badges (badges obtenus)
CREATE TABLE IF NOT EXISTS user_badges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid references profiles(id) ON DELETE CASCADE,
  badge_id        uuid references badges(id) ON DELETE CASCADE,
  league_id       uuid references leagues(id) ON DELETE CASCADE,
  earned_at       timestamp DEFAULT now(),
  UNIQUE(user_id, badge_id, league_id)
);
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- 9. Table ai_profiles (profil IA généré par Claude)
CREATE TABLE IF NOT EXISTS ai_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid references profiles(id) ON DELETE CASCADE,
  league_id       uuid references leagues(id) ON DELETE CASCADE,
  profile_type    text NOT NULL,
  description     text NOT NULL,
  generated_at    timestamp DEFAULT now(),
  UNIQUE(user_id, league_id)
);
ALTER TABLE ai_profiles ENABLE ROW LEVEL SECURITY;

-- 10. Table daily_summaries (résumé IA de la journée)
CREATE TABLE IF NOT EXISTS daily_summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id       uuid references leagues(id) ON DELETE CASCADE,
  summary_date    date NOT NULL,
  content         text NOT NULL,
  created_at      timestamp DEFAULT now(),
  UNIQUE(league_id, summary_date)
);
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- 11. Données initiales : badges
INSERT INTO badges (code, name, description, icon) VALUES
  ('first_blood', 'Premier Sang', 'Premier pronostic exact de la ligue', '🩸'),
  ('perfect_round', 'Round Parfait', 'Tous les pronos d''une journée corrects', '🎯'),
  ('top_scorer_hunter', 'Chasseur de Buteurs', '5 buteurs pronostiqués corrects', '⚽'),
  ('no_fear', 'Sans Peur', 'A pronostiqué un outsider qui gagne', '🦁'),
  ('loyal_fan', 'Fan Loyal', 'A pronostiqué tous les matchs de la phase de groupes', '🏅')
ON CONFLICT (code) DO NOTHING;
