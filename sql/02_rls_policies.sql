-- =====================================================
-- RLS POLICIES — Le Prono du GOAT
-- À exécuter dans : Supabase > SQL Editor > New query
-- APRÈS avoir exécuté 01_schema.sql
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions     ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES
-- =====================================================

-- Tout utilisateur connecté peut lire les profils
-- (nécessaire pour afficher les classements)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Un utilisateur ne peut modifier que son propre profil
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- L'insertion est gérée par le trigger handle_new_user (SECURITY DEFINER)
-- Pas besoin de policy INSERT ici

-- =====================================================
-- LEAGUES
-- =====================================================

-- Voir uniquement les ligues dont on est membre (ou admin)
CREATE POLICY "leagues_select_member"
  ON leagues FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
    OR admin_id = auth.uid()
  );

-- Créer une ligue : tout utilisateur connecté peut en créer
CREATE POLICY "leagues_insert_authenticated"
  ON leagues FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

-- Modifier une ligue : seulement l'admin de cette ligue
CREATE POLICY "leagues_update_admin"
  ON leagues FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Supprimer une ligue : seulement l'admin
CREATE POLICY "leagues_delete_admin"
  ON leagues FOR DELETE
  TO authenticated
  USING (admin_id = auth.uid());

-- =====================================================
-- LEAGUE_MEMBERS
-- =====================================================

-- Voir les membres d'une ligue dont on fait partie
CREATE POLICY "league_members_select"
  ON league_members FOR SELECT
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

-- Rejoindre une ligue (s'ajouter soi-même)
CREATE POLICY "league_members_insert_self"
  ON league_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Quitter une ligue (se retirer soi-même)
CREATE POLICY "league_members_delete_self"
  ON league_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- MATCHES
-- =====================================================

-- Tous les matchs sont visibles par tous les utilisateurs connectés
CREATE POLICY "matches_select_all"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

-- Seul le service_role (admin app) peut insérer/modifier des matchs
-- L'admin utilise la clé SUPABASE_SERVICE_ROLE_KEY côté serveur
-- On crée quand même une policy restrictive pour les autres rôles
CREATE POLICY "matches_insert_service"
  ON matches FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "matches_update_service"
  ON matches FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- PREDICTIONS
-- =====================================================

-- Un utilisateur voit ses propres pronostics
-- ET les pronostics des membres de ses ligues (pour le classement)
CREATE POLICY "predictions_select_own_and_league"
  ON predictions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

-- Créer un pronostic : seulement pour soi-même ET avant le coup d'envoi
-- C'est la policy de verrouillage CRITIQUE
CREATE POLICY "predictions_insert_before_kickoff"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND
    -- Vérification côté base de données : le match ne doit pas avoir commencé
    (
      SELECT kickoff_at FROM matches WHERE id = match_id
    ) > now()
  );

-- Modifier un pronostic : seulement si non verrouillé ET avant le coup d'envoi
-- Double sécurité : is_locked = false ET kickoff_at > now()
CREATE POLICY "predictions_update_before_kickoff"
  ON predictions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND is_locked = false
    AND (
      SELECT kickoff_at FROM matches WHERE id = match_id
    ) > now()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_locked = false
    AND (
      SELECT kickoff_at FROM matches WHERE id = match_id
    ) > now()
  );

-- Supprimer un pronostic : seulement avant le coup d'envoi
CREATE POLICY "predictions_delete_before_kickoff"
  ON predictions FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND is_locked = false
    AND (
      SELECT kickoff_at FROM matches WHERE id = match_id
    ) > now()
  );

-- Le service_role peut tout faire (pour le calcul des points par l'admin)
CREATE POLICY "predictions_all_service"
  ON predictions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
