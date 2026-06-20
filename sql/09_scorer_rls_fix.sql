-- Fix RLS : autoriser DELETE sur scorer_predictions avant le coup d'envoi
-- La policy précédente bloquait tout DELETE côté client, empêchant la mise à jour des buteurs

DROP POLICY IF EXISTS "scorer_pred_no_delete" ON scorer_predictions;

CREATE POLICY "scorer_pred_delete_before_kickoff" ON scorer_predictions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM predictions p
    JOIN matches m ON m.id = p.match_id
    WHERE p.id = prediction_id
      AND p.user_id = auth.uid()
      AND m.kickoff_at > now()
  ));
