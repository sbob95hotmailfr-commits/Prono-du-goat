-- ============================================
-- NIVEAU 3 — Analyses IA par match
-- À exécuter dans Supabase > SQL Editor
-- ============================================

-- Table : analyses IA pré-match et débrief post-match
CREATE TABLE IF NOT EXISTS match_ai_analyses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   uuid REFERENCES matches(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('prematch', 'debrief')),
  content    text NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  UNIQUE(match_id, type)
);

ALTER TABLE match_ai_analyses ENABLE ROW LEVEL SECURITY;

-- Lecture publique (membres authentifiés)
CREATE POLICY "Authenticated read match_ai_analyses"
  ON match_ai_analyses FOR SELECT
  TO authenticated
  USING (true);
