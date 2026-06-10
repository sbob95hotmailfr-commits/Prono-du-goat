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
