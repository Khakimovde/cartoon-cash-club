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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_views: {
        Row: {
          coins_earned: number | null
          id: string
          user_telegram_id: number
          viewed_at: string | null
        }
        Insert: {
          coins_earned?: number | null
          id?: string
          user_telegram_id: number
          viewed_at?: string | null
        }
        Update: {
          coins_earned?: number | null
          id?: string
          user_telegram_id?: number
          viewed_at?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          telegram_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          telegram_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          telegram_id?: number
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      channel_subscriptions: {
        Row: {
          channel_task_id: string | null
          completed_at: string | null
          id: string
          user_telegram_id: number
        }
        Insert: {
          channel_task_id?: string | null
          completed_at?: string | null
          id?: string
          user_telegram_id: number
        }
        Update: {
          channel_task_id?: string | null
          completed_at?: string | null
          id?: string
          user_telegram_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_subscriptions_channel_task_id_fkey"
            columns: ["channel_task_id"]
            isOneToOne: false
            referencedRelation: "channel_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_tasks: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          reward: number | null
          username: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          reward?: number | null
          username: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          reward?: number | null
          username?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_coins: number | null
          created_at: string | null
          id: string
          referred_telegram_id: number
          referrer_telegram_id: number
        }
        Insert: {
          bonus_coins?: number | null
          created_at?: string | null
          id?: string
          referred_telegram_id: number
          referrer_telegram_id: number
        }
        Update: {
          bonus_coins?: number | null
          created_at?: string | null
          id?: string
          referred_telegram_id?: number
          referrer_telegram_id?: number
        }
        Relationships: []
      }
      users: {
        Row: {
          coins: number | null
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          photo_url: string | null
          referral_code: string
          referral_count: number
          referral_earnings: number
          referred_by: number | null
          telegram_id: number
          updated_at: string | null
          username: string | null
        }
        Insert: {
          coins?: number | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          photo_url?: string | null
          referral_code: string
          referral_count?: number
          referral_earnings?: number
          referred_by?: number | null
          telegram_id: number
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          coins?: number | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          photo_url?: string | null
          referral_code?: string
          referral_count?: number
          referral_earnings?: number
          referred_by?: number | null
          telegram_id?: number
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount_coins: number
          amount_som: number
          card_number: string | null
          created_at: string | null
          id: string
          processed_at: string | null
          rejection_reason: string | null
          status: string | null
          user_telegram_id: number
        }
        Insert: {
          amount_coins: number
          amount_som: number
          card_number?: string | null
          created_at?: string | null
          id?: string
          processed_at?: string | null
          rejection_reason?: string | null
          status?: string | null
          user_telegram_id: number
        }
        Update: {
          amount_coins?: number
          amount_som?: number
          card_number?: string | null
          created_at?: string | null
          id?: string
          processed_at?: string | null
          rejection_reason?: string | null
          status?: string | null
          user_telegram_id?: number
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
