-- =====================================================
-- BONUS PHASE FINALE
-- Migration 11 — à exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. Table des pronostics spéciaux (Bonus 4)
CREATE TABLE IF NOT EXISTS tournament_predictions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users NOT NULL,
  league_id    uuid REFERENCES leagues NOT NULL,
  semi1        text NOT NULL,
  semi2        text NOT NULL,
  semi3        text NOT NULL,
  semi4        text NOT NULL,
  winner       text NOT NULL,
  points_earned integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, league_id)
);

ALTER TABLE tournament_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tournament predictions"
  ON tournament_predictions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "League members view tournament predictions"
  ON tournament_predictions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = tournament_predictions.league_id
      AND user_id = auth.uid()
  ));

-- 2. Mettre à jour la vue league_standings pour inclure les bonus tournoi
CREATE OR REPLACE VIEW league_standings AS
SELECT
  lm.league_id,
  p.id          AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(SUM(pred.points_earned), 0)
    + COALESCE(MAX(tp.points_earned), 0) AS total_points,
  COUNT(pred.id) AS predictions_count
FROM league_members lm
JOIN profiles p ON p.id = lm.user_id
LEFT JOIN predictions pred
  ON pred.user_id   = lm.user_id
  AND pred.league_id = lm.league_id
LEFT JOIN tournament_predictions tp
  ON tp.user_id   = lm.user_id
  AND tp.league_id = lm.league_id
GROUP BY lm.league_id, p.id, p.username, p.avatar_url
ORDER BY total_points DESC;
