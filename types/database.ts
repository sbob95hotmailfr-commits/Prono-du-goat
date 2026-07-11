export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          code: string;
          admin_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          admin_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          admin_id?: string;
          created_at?: string;
        };
      };
      league_members: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          home_team: string;
          away_team: string;
          home_flag: string | null;
          away_flag: string | null;
          kickoff_at: string;
          stage: string;
          home_score: number | null;
          away_score: number | null;
          status: "upcoming" | "live" | "finished";
          created_at: string;
          api_football_fixture_id: number | null;
          minute: number | null;
          last_synced_at: string | null;
          match_num: number | null;
        };
        Insert: {
          id?: string;
          home_team: string;
          away_team: string;
          home_flag?: string | null;
          away_flag?: string | null;
          kickoff_at: string;
          stage: string;
          home_score?: number | null;
          away_score?: number | null;
          status?: "upcoming" | "live" | "finished";
          created_at?: string;
          api_football_fixture_id?: number | null;
          minute?: number | null;
          last_synced_at?: string | null;
          match_num?: number | null;
        };
        Update: {
          id?: string;
          home_team?: string;
          away_team?: string;
          home_flag?: string | null;
          away_flag?: string | null;
          kickoff_at?: string;
          stage?: string;
          home_score?: number | null;
          away_score?: number | null;
          status?: "upcoming" | "live" | "finished";
          created_at?: string;
          api_football_fixture_id?: number | null;
          minute?: number | null;
          last_synced_at?: string | null;
          match_num?: number | null;
        };
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          league_id: string;
          home_score_pred: number;
          away_score_pred: number;
          points_earned: number;
          locked_at: string | null;
          is_locked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          league_id: string;
          home_score_pred: number;
          away_score_pred: number;
          points_earned?: number;
          locked_at?: string | null;
          is_locked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string;
          league_id?: string;
          home_score_pred?: number;
          away_score_pred?: number;
          points_earned?: number;
          locked_at?: string | null;
          is_locked?: boolean;
          created_at?: string;
        };
      };
      // ── Niveau 2 ──────────────────────────────────────────────────────
      players: {
        Row: {
          id: string;
          api_football_id: number;
          team_name: string;
          name: string;
          photo_url: string | null;
          position: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          api_football_id: number;
          team_name: string;
          name: string;
          photo_url?: string | null;
          position?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          api_football_id?: number;
          team_name?: string;
          name?: string;
          photo_url?: string | null;
          position?: string | null;
          created_at?: string;
        };
      };
      player_stats: {
        Row: {
          id: string;
          player_id: string;
          goals: number;
          assists: number;
          matches_played: number;
          yellow_cards: number;
          red_cards: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          goals?: number;
          assists?: number;
          matches_played?: number;
          yellow_cards?: number;
          red_cards?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          goals?: number;
          assists?: number;
          matches_played?: number;
          yellow_cards?: number;
          red_cards?: number;
          updated_at?: string;
        };
      };
      scorer_predictions: {
        Row: {
          id: string;
          prediction_id: string;
          player_id: string;
          bonus_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          prediction_id: string;
          player_id: string;
          bonus_earned?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          prediction_id?: string;
          player_id?: string;
          bonus_earned?: number;
          created_at?: string;
        };
      };
      match_scorers: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          minute: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          minute?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_id?: string;
          minute?: number | null;
          created_at?: string;
        };
      };
      reactions: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          icon: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description: string;
          icon: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string;
          icon?: string;
          created_at?: string;
        };
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          league_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          league_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          league_id?: string;
          earned_at?: string;
        };
      };
      ai_profiles: {
        Row: {
          id: string;
          user_id: string;
          league_id: string;
          profile_type: string;
          description: string;
          generated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          league_id: string;
          profile_type: string;
          description: string;
          generated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          league_id?: string;
          profile_type?: string;
          description?: string;
          generated_at?: string;
        };
      };
      daily_summaries: {
        Row: {
          id: string;
          league_id: string;
          summary_date: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          summary_date: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          league_id?: string;
          summary_date?: string;
          content?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      league_standings: {
        Row: {
          league_id: string;
          user_id: string;
          username: string;
          avatar_url: string | null;
          total_points: number;
          predictions_count: number;
        };
      };
    };
    Functions: {
      calculate_points_for_match: {
        Args: { match_id: string };
        Returns: void;
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type League = Database["public"]["Tables"]["leagues"]["Row"];
export type LeagueMember = Database["public"]["Tables"]["league_members"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Prediction = Database["public"]["Tables"]["predictions"]["Row"];
export type LeagueStanding = Database["public"]["Views"]["league_standings"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type PlayerStat = Database["public"]["Tables"]["player_stats"]["Row"];
export type ScorerPrediction = Database["public"]["Tables"]["scorer_predictions"]["Row"];
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"];
export type Badge = Database["public"]["Tables"]["badges"]["Row"];
export type UserBadge = Database["public"]["Tables"]["user_badges"]["Row"];
export type AiProfile = Database["public"]["Tables"]["ai_profiles"]["Row"];
export type DailySummary = Database["public"]["Tables"]["daily_summaries"]["Row"];
