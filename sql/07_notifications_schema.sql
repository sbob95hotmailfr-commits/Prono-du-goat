-- Migration : colonnes pour le système de notifications
-- À exécuter dans Supabase > SQL Editor

-- Colonne pour tracker si les emails de résultat ont été envoyés
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_notified_at timestamp WITH TIME ZONE;

-- Index pour les crons (cherche les matchs récemment terminés sans notification)
CREATE INDEX IF NOT EXISTS idx_matches_result_notified ON matches(status, result_notified_at)
  WHERE status = 'finished' AND result_notified_at IS NULL;
