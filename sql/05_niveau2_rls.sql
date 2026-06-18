-- ============================================
-- NIVEAU 2 — Policies RLS
-- 4 policies par table SANS EXCEPTION
-- ============================================

-- TABLE players
CREATE POLICY "players_select_all" ON players FOR SELECT USING (true);
CREATE POLICY "players_no_insert_user" ON players FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "players_no_update_user" ON players FOR UPDATE TO authenticated USING (false);
CREATE POLICY "players_no_delete_user" ON players FOR DELETE TO authenticated USING (false);

-- TABLE player_stats
CREATE POLICY "player_stats_select_all" ON player_stats FOR SELECT USING (true);
CREATE POLICY "player_stats_no_insert_user" ON player_stats FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "player_stats_no_update_user" ON player_stats FOR UPDATE TO authenticated USING (false);
CREATE POLICY "player_stats_no_delete_user" ON player_stats FOR DELETE TO authenticated USING (false);

-- TABLE scorer_predictions
CREATE POLICY "scorer_pred_select_own" ON scorer_predictions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM predictions p
    WHERE p.id = prediction_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "scorer_pred_insert_before_kickoff" ON scorer_predictions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM predictions p
    JOIN matches m ON m.id = p.match_id
    WHERE p.id = prediction_id AND p.user_id = auth.uid() AND m.kickoff_at > now()
  ));
CREATE POLICY "scorer_pred_update_before_kickoff" ON scorer_predictions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM predictions p
    JOIN matches m ON m.id = p.match_id
    WHERE p.id = prediction_id AND p.user_id = auth.uid() AND m.kickoff_at > now()
  ));
CREATE POLICY "scorer_pred_no_delete" ON scorer_predictions FOR DELETE TO authenticated USING (false);

-- TABLE match_scorers
CREATE POLICY "match_scorers_select_all" ON match_scorers FOR SELECT USING (true);
CREATE POLICY "match_scorers_no_insert_user" ON match_scorers FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "match_scorers_no_update_user" ON match_scorers FOR UPDATE TO authenticated USING (false);
CREATE POLICY "match_scorers_no_delete_user" ON match_scorers FOR DELETE TO authenticated USING (false);

-- TABLE reactions
CREATE POLICY "reactions_select_all" ON reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_own" ON reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "reactions_no_update" ON reactions FOR UPDATE TO authenticated USING (false);
CREATE POLICY "reactions_delete_own" ON reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- TABLE badges
CREATE POLICY "badges_select_all" ON badges FOR SELECT USING (true);
CREATE POLICY "badges_no_insert_user" ON badges FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "badges_no_update_user" ON badges FOR UPDATE TO authenticated USING (false);
CREATE POLICY "badges_no_delete_user" ON badges FOR DELETE TO authenticated USING (false);

-- TABLE user_badges
CREATE POLICY "user_badges_select_all" ON user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges_no_insert_user" ON user_badges FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "user_badges_no_update_user" ON user_badges FOR UPDATE TO authenticated USING (false);
CREATE POLICY "user_badges_no_delete_user" ON user_badges FOR DELETE TO authenticated USING (false);

-- TABLE ai_profiles
CREATE POLICY "ai_profiles_select_all" ON ai_profiles FOR SELECT USING (true);
CREATE POLICY "ai_profiles_no_insert_user" ON ai_profiles FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "ai_profiles_no_update_user" ON ai_profiles FOR UPDATE TO authenticated USING (false);
CREATE POLICY "ai_profiles_no_delete_user" ON ai_profiles FOR DELETE TO authenticated USING (false);

-- TABLE daily_summaries
CREATE POLICY "daily_summaries_select_members" ON daily_summaries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = daily_summaries.league_id AND lm.user_id = auth.uid()
  ));
CREATE POLICY "daily_summaries_no_insert_user" ON daily_summaries FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "daily_summaries_no_update_user" ON daily_summaries FOR UPDATE TO authenticated USING (false);
CREATE POLICY "daily_summaries_no_delete_user" ON daily_summaries FOR DELETE TO authenticated USING (false);
