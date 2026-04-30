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
      ai_usage_events: {
        Row: {
          completion_tokens: number | null
          created_at: string
          estimated_cost_usd: number | null
          gateway_request_id: string | null
          id: string
          model: string
          operation: string
          prompt_tokens: number | null
          provider: string
          search_mode: string | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          gateway_request_id?: string | null
          id?: string
          model: string
          operation: string
          prompt_tokens?: number | null
          provider?: string
          search_mode?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          gateway_request_id?: string | null
          id?: string
          model?: string
          operation?: string
          prompt_tokens?: number | null
          provider?: string
          search_mode?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      anonymized_training_events: {
        Row: {
          anonymized_session_id: string
          created_at: string
          displayed_results: Json | null
          feedback_summary: Json | null
          id: string
          interaction_summary: Json | null
          interpretation_summary: string | null
          outcome_score: number | null
          raw_prompt: string
          search_id: string
        }
        Insert: {
          anonymized_session_id: string
          created_at?: string
          displayed_results?: Json | null
          feedback_summary?: Json | null
          id?: string
          interaction_summary?: Json | null
          interpretation_summary?: string | null
          outcome_score?: number | null
          raw_prompt: string
          search_id: string
        }
        Update: {
          anonymized_session_id?: string
          created_at?: string
          displayed_results?: Json | null
          feedback_summary?: Json | null
          id?: string
          interaction_summary?: Json | null
          interpretation_summary?: string | null
          outcome_score?: number | null
          raw_prompt?: string
          search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymized_training_events_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_ip_quotas: {
        Row: {
          anonymous_session_id: string
          conversation_id: string
          created_at: string
          id: string
          ip: string
          search_count: number
          updated_at: string
        }
        Insert: {
          anonymous_session_id: string
          conversation_id: string
          created_at?: string
          id?: string
          ip: string
          search_count?: number
          updated_at?: string
        }
        Update: {
          anonymous_session_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          ip?: string
          search_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      apple_music_connections: {
        Row: {
          created_at: string
          id: string
          last_authorized_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_authorized_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_authorized_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          referral_code: string
          referred_by_user_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          referral_code: string
          referred_by_user_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          referral_code?: string
          referred_by_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          pro_rewarded_at: string | null
          referee_id: string
          referrer_id: string
          signup_rewarded_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pro_rewarded_at?: string | null
          referee_id: string
          referrer_id: string
          signup_rewarded_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pro_rewarded_at?: string | null
          referee_id?: string
          referrer_id?: string
          signup_rewarded_at?: string
        }
        Relationships: []
      }
      result_feedback: {
        Row: {
          anonymous_session_id: string | null
          created_at: string
          feedback_label: string
          id: string
          optional_text_feedback: string | null
          search_id: string
          search_result_id: string
          user_id: string | null
        }
        Insert: {
          anonymous_session_id?: string | null
          created_at?: string
          feedback_label: string
          id?: string
          optional_text_feedback?: string | null
          search_id: string
          search_result_id: string
          user_id?: string | null
        }
        Update: {
          anonymous_session_id?: string | null
          created_at?: string
          feedback_label?: string
          id?: string
          optional_text_feedback?: string | null
          search_id?: string
          search_result_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "result_feedback_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_feedback_search_result_id_fkey"
            columns: ["search_result_id"]
            isOneToOne: false
            referencedRelation: "search_results"
            referencedColumns: ["id"]
          },
        ]
      }
      result_interactions: {
        Row: {
          anonymous_session_id: string | null
          created_at: string
          id: string
          interaction_metadata: Json | null
          interaction_type: string
          search_id: string
          search_result_id: string
          user_id: string | null
        }
        Insert: {
          anonymous_session_id?: string | null
          created_at?: string
          id?: string
          interaction_metadata?: Json | null
          interaction_type: string
          search_id: string
          search_result_id: string
          user_id?: string | null
        }
        Update: {
          anonymous_session_id?: string | null
          created_at?: string
          id?: string
          interaction_metadata?: Json | null
          interaction_type?: string
          search_id?: string
          search_result_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "result_interactions_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_interactions_search_result_id_fkey"
            columns: ["search_result_id"]
            isOneToOne: false
            referencedRelation: "search_results"
            referencedColumns: ["id"]
          },
        ]
      }
      search_feedback: {
        Row: {
          anonymous_session_id: string | null
          created_at: string
          feedback_label: string
          id: string
          optional_text_feedback: string | null
          search_id: string
          user_id: string | null
        }
        Insert: {
          anonymous_session_id?: string | null
          created_at?: string
          feedback_label: string
          id?: string
          optional_text_feedback?: string | null
          search_id: string
          user_id?: string | null
        }
        Update: {
          anonymous_session_id?: string | null
          created_at?: string
          feedback_label?: string
          id?: string
          optional_text_feedback?: string | null
          search_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_feedback_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      search_results: {
        Row: {
          album_name: string | null
          artist_name: string
          artwork_url: string | null
          created_at: string
          emotional_tags: Json | null
          id: string
          match_explanation: string
          position: number
          relevance_score: number | null
          search_id: string
          source_provider: string
          track_id: string
          track_title: string
        }
        Insert: {
          album_name?: string | null
          artist_name: string
          artwork_url?: string | null
          created_at?: string
          emotional_tags?: Json | null
          id?: string
          match_explanation: string
          position: number
          relevance_score?: number | null
          search_id: string
          source_provider?: string
          track_id: string
          track_title: string
        }
        Update: {
          album_name?: string | null
          artist_name?: string
          artwork_url?: string | null
          created_at?: string
          emotional_tags?: Json | null
          id?: string
          match_explanation?: string
          position?: number
          relevance_score?: number | null
          search_id?: string
          source_provider?: string
          track_id?: string
          track_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_results_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          anonymous_session_id: string | null
          created_at: string
          id: string
          interpretation_summary: string | null
          interpreted_catharsis: string | null
          interpreted_energy: string | null
          interpreted_intimacy: string | null
          interpreted_mood: Json | null
          interpreted_tension: string | null
          interpreted_themes: Json | null
          model_version: string
          prompt_language: string
          prompt_version: string
          raw_prompt: string
          refine_metadata: Json | null
          user_id: string | null
        }
        Insert: {
          anonymous_session_id?: string | null
          created_at?: string
          id?: string
          interpretation_summary?: string | null
          interpreted_catharsis?: string | null
          interpreted_energy?: string | null
          interpreted_intimacy?: string | null
          interpreted_mood?: Json | null
          interpreted_tension?: string | null
          interpreted_themes?: Json | null
          model_version?: string
          prompt_language?: string
          prompt_version?: string
          raw_prompt: string
          refine_metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          anonymous_session_id?: string | null
          created_at?: string
          id?: string
          interpretation_summary?: string | null
          interpreted_catharsis?: string | null
          interpreted_energy?: string | null
          interpreted_intimacy?: string | null
          interpreted_mood?: Json | null
          interpreted_tension?: string | null
          interpreted_themes?: Json | null
          model_version?: string
          prompt_language?: string
          prompt_version?: string
          raw_prompt?: string
          refine_metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      spotify_connections: {
        Row: {
          access_token: string
          anonymous_session_id: string | null
          created_at: string
          display_name: string | null
          id: string
          product: string | null
          refresh_token: string
          spotify_user_id: string
          token_expires_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token: string
          anonymous_session_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          product?: string | null
          refresh_token: string
          spotify_user_id: string
          token_expires_at: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          anonymous_session_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          product?: string | null
          refresh_token?: string
          spotify_user_id?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_processed_events: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      track_streaming_id_cache: {
        Row: {
          apple_music_catalog_id: string | null
          apple_music_storefront: string | null
          artist_normalized: string
          artwork_url_template: string | null
          created_at: string
          hit_count: number
          last_hit_at: string
          preview_url: string | null
          spotify_track_id: string | null
          title_normalized: string
        }
        Insert: {
          apple_music_catalog_id?: string | null
          apple_music_storefront?: string | null
          artist_normalized: string
          artwork_url_template?: string | null
          created_at?: string
          hit_count?: number
          last_hit_at?: string
          preview_url?: string | null
          spotify_track_id?: string | null
          title_normalized: string
        }
        Update: {
          apple_music_catalog_id?: string | null
          apple_music_storefront?: string | null
          artist_normalized?: string
          artwork_url_template?: string | null
          created_at?: string
          hit_count?: number
          last_hit_at?: string
          preview_url?: string | null
          spotify_track_id?: string | null
          title_normalized?: string
        }
        Relationships: []
      }
      user_byo_ai_secrets: {
        Row: {
          ciphertext: string
          iv: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ciphertext: string
          iv: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ciphertext?: string
          iv?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_provider_mode: string
          allow_anonymized_improvement_data: boolean
          anonymous_session_id: string | null
          byo_ai_provider: string | null
          byo_api_key_masked: string | null
          byo_disclaimer_accepted_at: string | null
          byo_key_last_validated_at: string | null
          byo_key_status: string | null
          created_at: string
          description_language: string | null
          id: string
          sync_favorites_echoes_playlist: boolean
          theme: string | null
          tutorial_completed_at: string | null
          ui_language: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_provider_mode?: string
          allow_anonymized_improvement_data?: boolean
          anonymous_session_id?: string | null
          byo_ai_provider?: string | null
          byo_api_key_masked?: string | null
          byo_disclaimer_accepted_at?: string | null
          byo_key_last_validated_at?: string | null
          byo_key_status?: string | null
          created_at?: string
          description_language?: string | null
          id?: string
          sync_favorites_echoes_playlist?: boolean
          theme?: string | null
          tutorial_completed_at?: string | null
          ui_language?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_provider_mode?: string
          allow_anonymized_improvement_data?: boolean
          anonymous_session_id?: string | null
          byo_ai_provider?: string | null
          byo_api_key_masked?: string | null
          byo_disclaimer_accepted_at?: string | null
          byo_key_last_validated_at?: string | null
          byo_key_status?: string | null
          created_at?: string
          description_language?: string | null
          id?: string
          sync_favorites_echoes_playlist?: boolean
          theme?: string | null
          tutorial_completed_at?: string | null
          ui_language?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tokens: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_grant_pro: {
        Args: { p_user_id: string; p_years?: number }
        Returns: undefined
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          current_period_end: string
          display_name: string
          email: string
          is_admin: boolean
          plan: string
          status: string
          user_id: string
        }[]
      }
      admin_revoke_pro: { Args: { p_user_id: string }; Returns: undefined }
      claim_anonymous_search: {
        Args: { p_conversation: string; p_ip: string; p_session: string }
        Returns: Json
      }
      claim_referral: { Args: { p_code: string }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_track_streaming_id_cache: {
        Args: { p_artist_normalized: string; p_title_normalized: string }
        Returns: {
          apple_music_catalog_id: string | null
          apple_music_storefront: string | null
          artist_normalized: string
          artwork_url_template: string | null
          created_at: string
          hit_count: number
          last_hit_at: string
          preview_url: string | null
          spotify_track_id: string | null
          title_normalized: string
        }[]
        SetofOptions: {
          from: "*"
          to: "track_streaming_id_cache"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      grant_tokens: {
        Args: {
          p_amount: number
          p_description?: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      merge_track_streaming_id_cache: {
        Args: {
          p_apple_music_catalog_id?: string
          p_apple_music_storefront?: string
          p_artist_normalized: string
          p_artwork_url_template?: string
          p_preview_url?: string
          p_spotify_track_id?: string
          p_title_normalized: string
        }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      spend_token: {
        Args: { p_amount?: number; p_user_id: string }
        Returns: boolean
      }
      try_grant_referral_pro_bonus: {
        Args: { p_bonus: number; p_referee_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
