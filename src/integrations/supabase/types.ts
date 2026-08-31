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
      access_requests: {
        Row: {
          admin_note: string | null
          college_name: string
          created_at: string
          email: string
          id: string
          reason: string
          status: Database["public"]["Enums"]["request_status"]
          ticket_code: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          college_name: string
          created_at?: string
          email: string
          id?: string
          reason: string
          status?: Database["public"]["Enums"]["request_status"]
          ticket_code?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          college_name?: string
          created_at?: string
          email?: string
          id?: string
          reason?: string
          status?: Database["public"]["Enums"]["request_status"]
          ticket_code?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      auth_audit_log: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          severity: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          severity?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          severity?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      college_requests: {
        Row: {
          college_name: string
          created_at: string
          email: string
          id: string
        }
        Insert: {
          college_name: string
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          college_name?: string
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      colleges: {
        Row: {
          campus: Database["public"]["Enums"]["campus_id"] | null
          created_at: string
          domain: string
          id: string
          is_active: boolean
          name: string
          short_name: string
          updated_at: string
        }
        Insert: {
          campus?: Database["public"]["Enums"]["campus_id"] | null
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          name: string
          short_name: string
          updated_at?: string
        }
        Update: {
          campus?: Database["public"]["Enums"]["campus_id"] | null
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          name?: string
          short_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          amount: number
          campus: Database["public"]["Enums"]["campus_id"] | null
          id: string
          locked_at: string
          market_id: string
          market_question: string
          outcome: string | null
          reference_id: string
          resolved_at: string | null
          side: string
          user_id: string
        }
        Insert: {
          amount: number
          campus?: Database["public"]["Enums"]["campus_id"] | null
          id?: string
          locked_at?: string
          market_id: string
          market_question: string
          outcome?: string | null
          reference_id?: string
          resolved_at?: string | null
          side: string
          user_id: string
        }
        Update: {
          amount?: number
          campus?: Database["public"]["Enums"]["campus_id"] | null
          id?: string
          locked_at?: string
          market_id?: string
          market_question?: string
          outcome?: string | null
          reference_id?: string
          resolved_at?: string | null
          side?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          bio: string | null
          campus: Database["public"]["Enums"]["campus_id"] | null
          campus_verified: boolean
          created_at: string
          email: string
          id: string
          is_public: boolean
          last_login_at: string | null
          show_campus: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          campus?: Database["public"]["Enums"]["campus_id"] | null
          campus_verified?: boolean
          created_at?: string
          email: string
          id: string
          is_public?: boolean
          last_login_at?: string | null
          show_campus?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          campus?: Database["public"]["Enums"]["campus_id"] | null
          campus_verified?: boolean
          created_at?: string
          email?: string
          id?: string
          is_public?: boolean
          last_login_at?: string | null
          show_campus?: boolean
          updated_at?: string
          username?: string | null
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
      user_sessions: {
        Row: {
          browser: string | null
          device: string | null
          ended_at: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          platform: string | null
          session_fingerprint: string
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          device?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          platform?: string | null
          session_fingerprint: string
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          device?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          platform?: string | null
          session_fingerprint?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      verification_throttle: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number
          id: string
          last_sent_at: string | null
          locked_until: string | null
          purpose: string
          send_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number
          id?: string
          last_sent_at?: string | null
          locked_until?: string | null
          purpose: string
          send_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number
          id?: string
          last_sent_at?: string | null
          locked_until?: string | null
          purpose?: string
          send_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      campus_from_email: {
        Args: { _email: string }
        Returns: Database["public"]["Enums"]["campus_id"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "admin"
      campus_id: "fsu" | "uf" | "famu"
      request_status: "pending" | "under_review" | "approved" | "denied"
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
      app_role: ["student", "admin"],
      campus_id: ["fsu", "uf", "famu"],
      request_status: ["pending", "under_review", "approved", "denied"],
    },
  },
} as const
