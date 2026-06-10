-- =====================================================
-- SCHEMA — Le Prono du GOAT
-- À exécuter dans : Supabase > SQL Editor > New query
-- =====================================================

-- Extension pour générer des UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE : profiles (profils utilisateurs)
-- Créée automatiquement après inscription via trigger
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text UNIQUE NOT NULL,
  avatar_url  text,
  created_at  timestamp WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TABLE : leagues (ligues privées)
-- =====================================================
CREATE TABLE IF NOT EXISTS leagues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  code        text UNIQUE NOT NULL,  -- code d'invitation ex: "GOAT2026"
  admin_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamp WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TABLE : league_members (membres d'une ligue)
-- =====================================================
CREATE TABLE IF NOT EXISTS league_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id   uuid REFERENCES leagues(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   timestamp WITH TIME ZONE DEFAULT now(),
  UNIQUE(league_id, user_id)  -- un user ne peut rejoindre qu'une fois
);

-- =====================================================
-- TABLE : matches (matchs de la Coupe du Monde)
-- =====================================================
CREATE TABLE IF NOT EXISTS matches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team   text NOT NULL,
  away_team   text NOT NULL,
  home_flag   text,              -- emoji drapeau ex: "🇫🇷"
  away_flag   text,
  kickoff_at  timestamp WITH TIME ZONE NOT NULL,
  stage       text NOT NULL,    -- "Groupe A", "1/8 finale", etc.
  home_score  integer,          -- null avant le match
  away_score  integer,          -- null avant le match
  status      text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished')),
  created_at  timestamp WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- TABLE : predictions (pronostics des joueurs)
-- =====================================================
CREATE TABLE IF NOT EXISTS predictions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES profiles(id) ON DELETE CASCADE,
  match_id          uuid REFERENCES matches(id) ON DELETE CASCADE,
  league_id         uuid REFERENCES leagues(id) ON DELETE CASCADE,
  home_score_pred   integer NOT NULL,
  away_score_pred   integer NOT NULL,
  points_earned     integer DEFAULT 0,
  locked_at         timestamp WITH TIME ZONE,
  is_locked         boolean DEFAULT false,
  created_at        timestamp WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, match_id, league_id)  -- un seul prono par match par ligue
);

-- =====================================================
-- INDEX pour les performances
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_predictions_user_id    ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id   ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_league_id  ON predictions(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league  ON league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user    ON league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff        ON matches(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_matches_status         ON matches(status);

-- =====================================================
-- VUE : league_standings (classement par ligue)
-- Calcule automatiquement les points de chaque joueur
-- =====================================================
CREATE OR REPLACE VIEW league_standings AS
SELECT
  lm.league_id,
  p.id            AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(SUM(pred.points_earned), 0) AS total_points,
  COUNT(pred.id)                        AS predictions_count
FROM league_members lm
JOIN profiles p ON p.id = lm.user_id
LEFT JOIN predictions pred
  ON pred.user_id = lm.user_id
  AND pred.league_id = lm.league_id
GROUP BY lm.league_id, p.id, p.username, p.avatar_url
ORDER BY total_points DESC;

-- =====================================================
-- FONCTION : create_profile_on_signup
-- Crée automatiquement un profil quand un user s'inscrit
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger : s'exécute après chaque inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- FONCTION : calculate_points_for_match
-- Appelée par l'admin après saisie du score réel
-- Recalcule les points pour TOUS les pronostics du match
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_points_for_match(p_match_id uuid)
RETURNS void AS $$
DECLARE
  v_home_score  integer;
  v_away_score  integer;
  v_pred        RECORD;
  v_points      integer;
BEGIN
  -- Récupérer le score réel du match
  SELECT home_score, away_score
  INTO v_home_score, v_away_score
  FROM matches
  WHERE id = p_match_id;

  -- Vérifier que le score a bien été saisi
  IF v_home_score IS NULL OR v_away_score IS NULL THEN
    RAISE EXCEPTION 'Score non encore saisi pour ce match';
  END IF;

  -- Parcourir tous les pronostics liés à ce match
  FOR v_pred IN
    SELECT id, home_score_pred, away_score_pred
    FROM predictions
    WHERE match_id = p_match_id
  LOOP
    v_points := 0;

    -- Règle 1 : Score exact → 3 points
    IF v_pred.home_score_pred = v_home_score AND v_pred.away_score_pred = v_away_score THEN
      v_points := 3;

    -- Règle 2 : Match nul exact (les deux prévoient nul ET c'est nul) → 3 points
    -- Déjà couvert par la règle 1

    -- Règle 3 : Bon vainqueur (ou bon nul) → 1 point
    ELSIF (
      -- Prédit victoire domicile ET domicile gagne
      (v_pred.home_score_pred > v_pred.away_score_pred AND v_home_score > v_away_score)
      OR
      -- Prédit victoire extérieur ET extérieur gagne
      (v_pred.home_score_pred < v_pred.away_score_pred AND v_home_score < v_away_score)
      OR
      -- Prédit match nul ET c'est nul
      (v_pred.home_score_pred = v_pred.away_score_pred AND v_home_score = v_away_score)
    ) THEN
      v_points := 1;
    END IF;

    -- Mettre à jour les points et verrouiller le pronostic
    UPDATE predictions
    SET points_earned = v_points,
        is_locked = true,
        locked_at = COALESCE(locked_at, now())
    WHERE id = v_pred.id;
  END LOOP;

  -- Marquer le match comme terminé
  UPDATE matches
  SET status = 'finished'
  WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
