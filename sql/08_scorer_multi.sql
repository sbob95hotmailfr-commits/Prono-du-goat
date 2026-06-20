-- Migration : pronostic buteur multi-slots
-- Permet de pronostiquer plusieurs buteurs proportionnellement aux buts prédits
-- À exécuter dans Supabase > SQL Editor

-- 1. Supprimer l'ancienne contrainte unique (1 buteur par prédiction)
ALTER TABLE scorer_predictions DROP CONSTRAINT IF EXISTS scorer_predictions_prediction_id_key;

-- 2. Ajouter les colonnes slot et team
ALTER TABLE scorer_predictions ADD COLUMN IF NOT EXISTS slot integer NOT NULL DEFAULT 1;
ALTER TABLE scorer_predictions ADD COLUMN IF NOT EXISTS team text;

-- 3. Nouvelle contrainte : 1 buteur par (prédiction, slot, équipe)
ALTER TABLE scorer_predictions
  ADD CONSTRAINT scorer_predictions_pred_slot_team_unique
  UNIQUE(prediction_id, slot, team);
