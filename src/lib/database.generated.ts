// Generated from the live schema by `npm run db:types`. Do not edit by hand;
// corrections the generator cannot infer live in database.types.ts.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          threshold: number | null
        }
        Insert: {
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          threshold?: number | null
        }
        Update: {
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          threshold?: number | null
        }
        Relationships: []
      }
      challenge_seasons: {
        Row: {
          created_at: string
          daily_cap: number
          ends_on: string
          final_push_deadline: string
          final_push_on: string
          final_push_opens_at: string
          goal: number
          logging_closes_at: string
          logging_opens_at: string
          name: string
          per_log_cap: number
          registration_closes_at: string | null
          registration_opens_at: string | null
          starts_on: string
          status: string
          time_zone: string
          year: number
        }
        Insert: {
          created_at?: string
          daily_cap?: number
          ends_on: string
          final_push_deadline: string
          final_push_on: string
          final_push_opens_at: string
          goal?: number
          logging_closes_at: string
          logging_opens_at: string
          name: string
          per_log_cap?: number
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          starts_on: string
          status: string
          time_zone?: string
          year: number
        }
        Update: {
          created_at?: string
          daily_cap?: number
          ends_on?: string
          final_push_deadline?: string
          final_push_on?: string
          final_push_opens_at?: string
          goal?: number
          logging_closes_at?: string
          logging_opens_at?: string
          name?: string
          per_log_cap?: number
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          starts_on?: string
          status?: string
          time_zone?: string
          year?: number
        }
        Relationships: []
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_milestones: {
        Row: {
          achievement_id: string | null
          hit_at: string | null
          hit_by: string | null
          season_year: number
          threshold: number
          total_at_hit: number | null
        }
        Insert: {
          achievement_id?: string | null
          hit_at?: string | null
          hit_by?: string | null
          season_year: number
          threshold: number
          total_at_hit?: number | null
        }
        Update: {
          achievement_id?: string | null
          hit_at?: string | null
          hit_by?: string | null
          season_year?: number
          threshold?: number
          total_at_hit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_milestones_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_milestones_hit_by_fkey"
            columns: ["hit_by"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_milestones_hit_by_fkey"
            columns: ["hit_by"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_milestones_hit_by_fkey"
            columns: ["hit_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_milestones_hit_by_fkey"
            columns: ["hit_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_milestones_hit_by_fkey"
            columns: ["hit_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_milestones_hit_by_fkey"
            columns: ["hit_by"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_milestones_hit_by_fkey"
            columns: ["hit_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_milestones_season_year_fkey"
            columns: ["season_year"]
            isOneToOne: false
            referencedRelation: "challenge_seasons"
            referencedColumns: ["year"]
          },
        ]
      }
      contest_participants: {
        Row: {
          contest_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          contest_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          contest_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_participants_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contest_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contests: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          end_date: string
          id: string
          invite_code: string
          is_public: boolean | null
          name: string
          season_year: number
          start_date: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          end_date: string
          id?: string
          invite_code: string
          is_public?: boolean | null
          name: string
          season_year: number
          start_date: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          end_date?: string
          id?: string
          invite_code?: string
          is_public?: boolean | null
          name?: string
          season_year?: number
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "contests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contests_season_year_fkey"
            columns: ["season_year"]
            isOneToOne: false
            referencedRelation: "challenge_seasons"
            referencedColumns: ["year"]
          },
        ]
      }
      email_campaign_sends: {
        Row: {
          campaign: string
          sent_at: string
          user_id: string
        }
        Insert: {
          campaign: string
          sent_at?: string
          user_id: string
        }
        Update: {
          campaign?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_campaign_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaign_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          email: string
          id: string
          notified_at: string | null
          source: string | null
          subscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          notified_at?: string | null
          source?: string | null
          subscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          notified_at?: string | null
          source?: string | null
          subscribed_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          body: string | null
          created_at: string
          id: string
          message_id: string | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          body?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          read_at?: string | null
          type?: string
          user_id: string
        }
        Update: {
          actor_id?: string
          body?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pledges: {
        Row: {
          charity: string
          created_at: string | null
          id: string
          is_active: boolean | null
          pledge_type: string
          rate_cents: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          charity?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pledge_type?: string
          rate_cents: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          charity?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pledge_type?: string
          rate_cents?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_opt_out: boolean
          final_push_emailed_at: string | null
          finale_emailed_at: string | null
          id: string
          last_reminder_at: string | null
          launch_emailed_at: string | null
          referred_by: string | null
          state_code: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_opt_out?: boolean
          final_push_emailed_at?: string | null
          finale_emailed_at?: string | null
          id: string
          last_reminder_at?: string | null
          launch_emailed_at?: string | null
          referred_by?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_opt_out?: boolean
          final_push_emailed_at?: string | null
          finale_emailed_at?: string | null
          id?: string
          last_reminder_at?: string | null
          launch_emailed_at?: string | null
          referred_by?: string | null
          state_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pushup_logs: {
        Row: {
          client_log_id: string | null
          count: number
          created_at: string
          id: string
          logged_at: string
          notes: string | null
          season_year: number
          user_id: string
        }
        Insert: {
          client_log_id?: string | null
          count: number
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          season_year: number
          user_id: string
        }
        Update: {
          client_log_id?: string | null
          count?: number
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          season_year?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pushup_logs_season_year_fkey"
            columns: ["season_year"]
            isOneToOne: false
            referencedRelation: "challenge_seasons"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      season_interests: {
        Row: {
          created_at: string
          email: string
          id: string
          season_year: number
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          season_year: number
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          season_year?: number
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_interests_season_year_fkey"
            columns: ["season_year"]
            isOneToOne: false
            referencedRelation: "challenge_seasons"
            referencedColumns: ["year"]
          },
        ]
      }
      season_registrations: {
        Row: {
          registered_at: string
          season_year: number
          user_id: string
        }
        Insert: {
          registered_at?: string
          season_year: number
          user_id: string
        }
        Update: {
          registered_at?: string
          season_year?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_registrations_season_year_fkey"
            columns: ["season_year"]
            isOneToOne: false
            referencedRelation: "challenge_seasons"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "season_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "season_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      season_user_stats: {
        Row: {
          best_day: number
          current_streak: number
          days_logged: number
          last_log_date: string | null
          longest_streak: number
          season_year: number
          total_pushups: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_day?: number
          current_streak?: number
          days_logged?: number
          last_log_date?: string | null
          longest_streak?: number
          season_year: number
          total_pushups?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_day?: number
          current_streak?: number
          days_logged?: number
          last_log_date?: string | null
          longest_streak?: number
          season_year?: number
          total_pushups?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_user_stats_season_year_fkey"
            columns: ["season_year"]
            isOneToOne: false
            referencedRelation: "challenge_seasons"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      final_push_board: {
        Row: {
          display_name: string | null
          final_day_pushups: number | null
          final_push_rank: number | null
          id: string | null
          state_code: string | null
        }
        Relationships: []
      }
      final_push_feed: {
        Row: {
          count: number | null
          created_at: string | null
          display_name: string | null
          id: string | null
          state_code: string | null
          user_id: string | null
        }
        Relationships: []
      }
      final_push_pulse: {
        Row: {
          biggest_set: number | null
          last_rep_at: string | null
          patriots: number | null
          sets_logged: number | null
          total_pushups: number | null
        }
        Relationships: []
      }
      final_push_state_board: {
        Row: {
          avg_pushups: number | null
          participants: number | null
          state_code: string | null
          state_rank: number | null
          total_pushups: number | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          avatar_url: string | null
          best_day: number | null
          created_at: string | null
          current_streak: number | null
          days_logged: number | null
          display_name: string | null
          global_rank: number | null
          id: string | null
          longest_streak: number | null
          recruits: number | null
          state_code: string | null
          total_pushups: number | null
        }
        Relationships: []
      }
      pledge_leaderboard: {
        Row: {
          charity: string | null
          display_name: string | null
          pledge_type: string | null
          pledged_amount: number | null
          rate_cents: number | null
          state_code: string | null
          total_pushups: number | null
          user_id: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          state_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          state_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          state_code?: string | null
        }
        Relationships: []
      }
      public_user_daily_pushups: {
        Row: {
          daily_pushups: number | null
          log_date: string | null
          season_year: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pushup_logs_season_year_fkey"
            columns: ["season_year"]
            isOneToOne: false
            referencedRelation: "challenge_seasons"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "final_push_feed"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "season_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      season_leaderboard: {
        Row: {
          avatar_url: string | null
          best_day: number | null
          created_at: string | null
          current_streak: number | null
          days_logged: number | null
          display_name: string | null
          global_rank: number | null
          id: string | null
          longest_streak: number | null
          recruits: number | null
          season_year: number | null
          state_code: string | null
          total_pushups: number | null
        }
        Relationships: [
          {
            foreignKeyName: "season_user_stats_season_year_fkey"
            columns: ["season_year"]
            isOneToOne: false
            referencedRelation: "challenge_seasons"
            referencedColumns: ["year"]
          },
        ]
      }
      season_state_leaderboard: {
        Row: {
          avg_pushups: number | null
          participants: number | null
          season_year: number | null
          state_code: string | null
          state_rank: number | null
          total_pushups: number | null
        }
        Relationships: [
          {
            foreignKeyName: "season_user_stats_season_year_fkey"
            columns: ["season_year"]
            isOneToOne: false
            referencedRelation: "challenge_seasons"
            referencedColumns: ["year"]
          },
        ]
      }
      state_leaderboard: {
        Row: {
          avg_pushups: number | null
          participants: number | null
          state_code: string | null
          state_rank: number | null
          total_pushups: number | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          best_day: number | null
          current_streak: number | null
          days_logged: number | null
          last_log_date: string | null
          longest_streak: number | null
          season_year: number | null
          total_pushups: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      achievement_earned_at: {
        Args: {
          p_requirement_type: string
          p_season_year: number
          p_threshold: number
          p_user_id: string
        }
        Returns: string
      }
      calculate_pledge_amount: {
        Args: { p_total_pushups?: number; p_user_id: string }
        Returns: number
      }
      can_broadcast_everyone: { Args: { uid: string }; Returns: boolean }
      can_use_chat: { Args: never; Returns: boolean }
      can_use_public_contests: { Args: never; Returns: boolean }
      clear_pushups_for_day: { Args: { p_day: string }; Returns: Json }
      compute_streaks:
        | { Args: { p_user_id: string }; Returns: Record<string, unknown> }
        | {
            Args: { p_season_year: number; p_user_id: string }
            Returns: Record<string, unknown>
          }
      current_season: { Args: never; Returns: Json }
      get_community_progress: { Args: never; Returns: Json }
      get_contest_invite_preview: {
        Args: { p_invite_code: string }
        Returns: {
          name: string
          participant_count: number
        }[]
      }
      get_recruit_count: { Args: never; Returns: number }
      is_handle_allowed: { Args: { handle: string }; Returns: boolean }
      is_handle_available: { Args: { p_handle: string }; Returns: boolean }
      is_message_allowed: { Args: { message: string }; Returns: boolean }
      join_contest_by_invite_code: {
        Args: { p_invite_code: string }
        Returns: {
          created_at: string
          creator_id: string
          description: string | null
          end_date: string
          id: string
          invite_code: string
          is_public: boolean | null
          name: string
          season_year: number
          start_date: string
        }
        SetofOptions: {
          from: "*"
          to: "contests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_pushups: {
        Args: {
          p_client_log_id?: string
          p_count: number
          p_logged_on?: string
          p_notes?: string
        }
        Returns: Json
      }
      participant_count: { Args: never; Returns: number }
      recalculate_user_stats: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      reconcile_achievements: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      refresh_season_stats: {
        Args: { p_season_year: number; p_user_id: string }
        Returns: undefined
      }
      resolve_handle: { Args: { p_handle: string }; Returns: string }
      season_for_display: { Args: never; Returns: number }
      season_for_log_date: { Args: { p_logged_at: string }; Returns: number }
      season_for_logging: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
