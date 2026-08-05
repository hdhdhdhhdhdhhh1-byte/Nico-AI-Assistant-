export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      assistant_events: {
        Row: {
          created_at: string;
          detail: string | null;
          event_type: string;
          id: string;
          metadata: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          detail?: string | null;
          event_type: string;
          id?: string;
          metadata?: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          detail?: string | null;
          event_type?: string;
          id?: string;
          metadata?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assistant_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      device_permissions: {
        Row: {
          created_at: string;
          device_label: string | null;
          id: string;
          permission: string;
          platform: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          device_label?: string | null;
          id?: string;
          permission: string;
          platform?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_label?: string | null;
          id?: string;
          permission?: string;
          platform?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "device_permissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_records: {
        Row: {
          confidence: number;
          correction: string | null;
          created_at: string;
          id: string;
          learned_preference: Json | null;
          signal_type: string;
          user_id: string;
        };
        Insert: {
          confidence?: number;
          correction?: string | null;
          created_at?: string;
          id?: string;
          learned_preference?: Json | null;
          signal_type: string;
          user_id: string;
        };
        Update: {
          confidence?: number;
          correction?: string | null;
          created_at?: string;
          id?: string;
          learned_preference?: Json | null;
          signal_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      memories: {
        Row: {
          confirmed: boolean;
          content: string;
          created_at: string;
          embedding: Json | null;
          expires_at: string | null;
          id: string;
          importance: string;
          key: string | null;
          retention: string;
          score: number;
          type: string;
          user_id: string;
        };
        Insert: {
          confirmed?: boolean;
          content: string;
          created_at?: string;
          embedding?: Json | null;
          expires_at?: string | null;
          id?: string;
          importance?: string;
          key?: string | null;
          retention?: string;
          score?: number;
          type?: string;
          user_id: string;
        };
        Update: {
          confirmed?: boolean;
          content?: string;
          created_at?: string;
          embedding?: Json | null;
          expires_at?: string | null;
          id?: string;
          importance?: string;
          key?: string | null;
          retention?: string;
          score?: number;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          intent: string | null;
          role: string;
          user_id: string;
          voice_metadata: Json | null;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          intent?: string | null;
          role: string;
          user_id: string;
          voice_metadata?: Json | null;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          intent?: string | null;
          role?: string;
          user_id?: string;
          voice_metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          communication_style: string;
          created_at: string;
          important_dates: Json;
          interests: Json;
          language: string;
          personality_settings: Json;
          preferences: Json;
          preferred_name: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          communication_style?: string;
          created_at?: string;
          important_dates?: Json;
          interests?: Json;
          language?: string;
          personality_settings?: Json;
          preferences?: Json;
          preferred_name?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          communication_style?: string;
          created_at?: string;
          important_dates?: Json;
          interests?: Json;
          language?: string;
          personality_settings?: Json;
          preferences?: Json;
          preferred_name?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          auth_id: string | null;
          created_at: string;
          guest_id: string | null;
          id: string;
          last_active: string;
        };
        Insert: {
          auth_id?: string | null;
          created_at?: string;
          guest_id?: string | null;
          id?: string;
          last_active?: string;
        };
        Update: {
          auth_id?: string | null;
          created_at?: string;
          guest_id?: string | null;
          id?: string;
          last_active?: string;
        };
        Relationships: [];
      };
      voice_preferences: {
        Row: {
          created_at: string;
          language: string;
          speed: number;
          tone: string;
          updated_at: string;
          user_id: string;
          voice_name: string;
        };
        Insert: {
          created_at?: string;
          language?: string;
          speed?: number;
          tone?: string;
          updated_at?: string;
          user_id: string;
          voice_name?: string;
        };
        Update: {
          created_at?: string;
          language?: string;
          speed?: number;
          tone?: string;
          updated_at?: string;
          user_id?: string;
          voice_name?: string;
        };
        Relationships: [];
      };
      voice_sessions: {
        Row: {
          confidence: number | null;
          conversation_id: string | null;
          created_at: string;
          duration: number;
          id: string;
          language: string;
          user_id: string;
        };
        Insert: {
          confidence?: number | null;
          conversation_id?: string | null;
          created_at?: string;
          duration?: number;
          id?: string;
          language?: string;
          user_id: string;
        };
        Update: {
          confidence?: number | null;
          conversation_id?: string | null;
          created_at?: string;
          duration?: number;
          id?: string;
          language?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_sessions_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_settings: {
        Row: {
          always_ready: boolean;
          auto_greeting: boolean;
          created_at: string;
          language: string;
          pitch: number;
          speed: number;
          style: string;
          updated_at: string;
          user_id: string;
          voice_id: string;
          wake_word: string;
          wake_word_enabled: boolean;
        };
        Insert: {
          always_ready?: boolean;
          auto_greeting?: boolean;
          created_at?: string;
          language?: string;
          pitch?: number;
          speed?: number;
          style?: string;
          updated_at?: string;
          user_id: string;
          voice_id?: string;
          wake_word?: string;
          wake_word_enabled?: boolean;
        };
        Update: {
          always_ready?: boolean;
          auto_greeting?: boolean;
          created_at?: string;
          language?: string;
          pitch?: number;
          speed?: number;
          style?: string;
          updated_at?: string;
          user_id?: string;
          voice_id?: string;
          wake_word?: string;
          wake_word_enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "voice_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
