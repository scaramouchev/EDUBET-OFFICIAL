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
      campus_events: {
        Row: {
          campus: Database["public"]["Enums"]["campus_id"]
          category: string
          created_at: string
          description: string | null
          ends_at: string | null
          external_id: string | null
          id: string
          is_active: boolean
          location: string | null
          source: Database["public"]["Enums"]["event_source"]
          starts_at: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          campus: Database["public"]["Enums"]["campus_id"]
          category?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          source?: Database["public"]["Enums"]["event_source"]
          starts_at: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          campus?: Database["public"]["Enums"]["campus_id"]
          category?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          source?: Database["public"]["Enums"]["event_source"]
          starts_at?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      coin_balances: {
        Row: {
          balance: number
          lifetime_staked: number
          lifetime_won: number
          sweepstakes_entries: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          lifetime_staked?: number
          lifetime_won?: number
          sweepstakes_entries?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          lifetime_staked?: number
          lifetime_won?: number
          sweepstakes_entries?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          entries_delta: number
          id: string
          reason: string
          reference: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          entries_delta?: number
          id?: string
          reason: string
          reference?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          entries_delta?: number
          id?: string
          reason?: string
          reference?: string | null
          user_id?: string
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
      event_feeds: {
        Row: {
          campus: Database["public"]["Enums"]["campus_id"]
          created_at: string
          id: string
          is_active: boolean
          last_result: string | null
          last_synced_at: string | null
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          campus: Database["public"]["Enums"]["campus_id"]
          created_at?: string
          id?: string
          is_active?: boolean
          last_result?: string | null
          last_synced_at?: string | null
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          campus?: Database["public"]["Enums"]["campus_id"]
          created_at?: string
          id?: string
          is_active?: boolean
          last_result?: string | null
          last_synced_at?: string | null
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          campus: Database["public"]["Enums"]["campus_id"] | null
          category: string
          closes_at: string
          created_at: string
          created_by: string | null
          detail: string | null
          event_id: string | null
          id: string
          no_odds: number
          outcome: string | null
          question: string
          resolution_note: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["market_status"]
          sweepstakes_entries_reward: number
          updated_at: string
          yes_odds: number
        }
        Insert: {
          campus?: Database["public"]["Enums"]["campus_id"] | null
          category?: string
          closes_at: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          event_id?: string | null
          id?: string
          no_odds?: number
          outcome?: string | null
          question: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["market_status"]
          sweepstakes_entries_reward?: number
          updated_at?: string
          yes_odds?: number
        }
        Update: {
          campus?: Database["public"]["Enums"]["campus_id"] | null
          category?: string
          closes_at?: string
          created_at?: string
          created_by?: string | null
          detail?: string | null
          event_id?: string | null
          id?: string
          no_odds?: number
          outcome?: string | null
          question?: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["market_status"]
          sweepstakes_entries_reward?: number
          updated_at?: string
          yes_odds?: number
        }
        Relationships: [
          {
            foreignKeyName: "markets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "campus_events"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          amount: number
          campus: Database["public"]["Enums"]["campus_id"] | null
          entries_awarded: number
          id: string
          locked_at: string
          market_id: string
          market_question: string
          odds: number
          outcome: string | null
          payout: number
          reference_id: string
          resolved_at: string | null
          side: string
          user_id: string
        }
        Insert: {
          amount: number
          campus?: Database["public"]["Enums"]["campus_id"] | null
          entries_awarded?: number
          id?: string
          locked_at?: string
          market_id: string
          market_question: string
          odds?: number
          outcome?: string | null
          payout?: number
          reference_id?: string
          resolved_at?: string | null
          side: string
          user_id: string
        }
        Update: {
          amount?: number
          campus?: Database["public"]["Enums"]["campus_id"] | null
          entries_awarded?: number
          id?: string
          locked_at?: string
          market_id?: string
          market_question?: string
          odds?: number
          outcome?: string | null
          payout?: number
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
      sweepstakes: {
        Row: {
          campus: Database["public"]["Enums"]["campus_id"] | null
          created_at: string
          description: string | null
          drawn_at: string | null
          draws_at: string
          entry_cost: number
          id: string
          prize: string
          status: Database["public"]["Enums"]["sweepstakes_status"]
          title: string
          updated_at: string
          winner_user_id: string | null
        }
        Insert: {
          campus?: Database["public"]["Enums"]["campus_id"] | null
          created_at?: string
          description?: string | null
          drawn_at?: string | null
          draws_at: string
          entry_cost?: number
          id?: string
          prize: string
          status?: Database["public"]["Enums"]["sweepstakes_status"]
          title: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Update: {
          campus?: Database["public"]["Enums"]["campus_id"] | null
          created_at?: string
          description?: string | null
          drawn_at?: string | null
          draws_at?: string
          entry_cost?: number
          id?: string
          prize?: string
          status?: Database["public"]["Enums"]["sweepstakes_status"]
          title?: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Relationships: []
      }
      sweepstakes_entries: {
        Row: {
          created_at: string
          entries: number
          id: string
          sweepstakes_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entries?: number
          id?: string
          sweepstakes_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entries?: number
          id?: string
          sweepstakes_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sweepstakes_entries_sweepstakes_id_fkey"
            columns: ["sweepstakes_id"]
            isOneToOne: false
            referencedRelation: "sweepstakes"
            referencedColumns: ["id"]
          },
        ]
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
      draw_sweepstakes: { Args: { _sweepstakes_id: string }; Returns: string }
      ensure_balance: { Args: { _user: string }; Returns: undefined }
      enter_sweepstakes: {
        Args: { _entries?: number; _sweepstakes_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      resolve_market: {
        Args: { _market_id: string; _note?: string; _outcome: string }
        Returns: {
          paid: number
          settled: number
          winners: number
        }[]
      }
    }
    Enums: {
      app_role: "student" | "admin"
      campus_id: "fsu" | "uf" | "famu"
      event_source: "seed" | "admin" | "feed"
      market_status: "draft" | "open" | "closed" | "resolved" | "void"
      request_status: "pending" | "under_review" | "approved" | "denied"
      sweepstakes_status: "upcoming" | "open" | "drawing" | "closed"
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
    Enums: {
      app_role: ["student", "admin"],
      campus_id: ["fsu", "uf", "famu"],
      event_source: ["seed", "admin", "feed"],
      market_status: ["draft", "open", "closed", "resolved", "void"],
      request_status: ["pending", "under_review", "approved", "denied"],
      sweepstakes_status: ["upcoming", "open", "drawing", "closed"],
    },
  },
} as const
