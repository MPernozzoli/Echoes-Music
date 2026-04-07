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
      user_settings: {
        Row: {
          allow_anonymized_improvement_data: boolean
          anonymous_session_id: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allow_anonymized_improvement_data?: boolean
          anonymous_session_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allow_anonymized_improvement_data?: boolean
          anonymous_session_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
