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
      correction_rules: {
        Row: {
          applied_count: number | null
          correct: string | null
          created_at: string
          id: string
          is_active: boolean | null
          lesson: string | null
          master_profile_id: string | null
          region: string | null
          scene_pattern: string | null
          updated_at: string
          wrong: string | null
        }
        Insert: {
          applied_count?: number | null
          correct?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          lesson?: string | null
          master_profile_id?: string | null
          region?: string | null
          scene_pattern?: string | null
          updated_at?: string
          wrong?: string | null
        }
        Update: {
          applied_count?: number | null
          correct?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          lesson?: string | null
          master_profile_id?: string | null
          region?: string | null
          scene_pattern?: string | null
          updated_at?: string
          wrong?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "correction_rules_master_profile_id_fkey"
            columns: ["master_profile_id"]
            isOneToOne: false
            referencedRelation: "master_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      corrections: {
        Row: {
          bolge: string | null
          correct: string | null
          created_at: string
          created_by: string | null
          id: string
          lesson: string | null
          scene: string | null
          updated_at: string
          usta: string | null
          wo_id: string | null
          wrong: string | null
        }
        Insert: {
          bolge?: string | null
          correct?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lesson?: string | null
          scene?: string | null
          updated_at?: string
          usta?: string | null
          wo_id?: string | null
          wrong?: string | null
        }
        Update: {
          bolge?: string | null
          correct?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lesson?: string | null
          scene?: string | null
          updated_at?: string
          usta?: string | null
          wo_id?: string | null
          wrong?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corrections_wo_id_fkey"
            columns: ["wo_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_sessions: {
        Row: {
          created_at: string
          id: string
          machine_id: string | null
          machine_name: string | null
          status: string | null
          title: string | null
          turns: Json | null
          updated_at: string
          user_id: string | null
          wo_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          machine_id?: string | null
          machine_name?: string | null
          status?: string | null
          title?: string | null
          turns?: Json | null
          updated_at?: string
          user_id?: string | null
          wo_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          machine_id?: string | null
          machine_name?: string | null
          status?: string | null
          title?: string | null
          turns?: Json | null
          updated_at?: string
          user_id?: string | null
          wo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_sessions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnosis_sessions_wo_id_fkey"
            columns: ["wo_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_cases: {
        Row: {
          alarm: string | null
          bolge: string | null
          created_at: string
          created_by: string | null
          diagnosis: string | null
          discovered_by_name: string | null
          id: string
          machine_id: string | null
          month: string | null
          success: boolean | null
          updated_at: string
          usta: string | null
          wo_id: string | null
        }
        Insert: {
          alarm?: string | null
          bolge?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          discovered_by_name?: string | null
          id?: string
          machine_id?: string | null
          month?: string | null
          success?: boolean | null
          updated_at?: string
          usta?: string | null
          wo_id?: string | null
        }
        Update: {
          alarm?: string | null
          bolge?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          discovered_by_name?: string | null
          id?: string
          machine_id?: string | null
          month?: string | null
          success?: boolean | null
          updated_at?: string
          usta?: string | null
          wo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_cases_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_cases_wo_id_fkey"
            columns: ["wo_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_logs: {
        Row: {
          created_at: string
          error_msg: string | null
          file_name: string | null
          findings: Json | null
          id: string
          machine_id: string | null
          recommendations: Json | null
          recurring_match: Json | null
          status: string | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_msg?: string | null
          file_name?: string | null
          findings?: Json | null
          id?: string
          machine_id?: string | null
          recommendations?: Json | null
          recurring_match?: Json | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_msg?: string | null
          file_name?: string | null
          findings?: Json | null
          id?: string
          machine_id?: string | null
          recommendations?: Json | null
          recurring_match?: Json | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_service_history: {
        Row: {
          created_at: string
          description: string
          duration_hours: number | null
          id: string
          machine_id: string | null
          service_date: string
          technician_name: string | null
          updated_at: string
          wo_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          duration_hours?: number | null
          id?: string
          machine_id?: string | null
          service_date: string
          technician_name?: string | null
          updated_at?: string
          wo_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          duration_hours?: number | null
          id?: string
          machine_id?: string | null
          service_date?: string
          technician_name?: string | null
          updated_at?: string
          wo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_service_history_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_service_history_wo_id_fkey"
            columns: ["wo_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          alert_text: string | null
          city: string | null
          client: string | null
          created_at: string
          district: string | null
          id: string
          last_service: string | null
          model: string | null
          name: string
          next_maintenance: string | null
          operating_hours: number | null
          region: string | null
          risk_next_date: string | null
          risk_note: string | null
          risk_score: number | null
          serial_no: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          alert_text?: string | null
          city?: string | null
          client?: string | null
          created_at?: string
          district?: string | null
          id?: string
          last_service?: string | null
          model?: string | null
          name: string
          next_maintenance?: string | null
          operating_hours?: number | null
          region?: string | null
          risk_next_date?: string | null
          risk_note?: string | null
          risk_score?: number | null
          serial_no?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          alert_text?: string | null
          city?: string | null
          client?: string | null
          created_at?: string
          district?: string | null
          id?: string
          last_service?: string | null
          model?: string | null
          name?: string
          next_maintenance?: string | null
          operating_hours?: number | null
          region?: string | null
          risk_next_date?: string | null
          risk_note?: string | null
          risk_score?: number | null
          serial_no?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      master_profiles: {
        Row: {
          city: string | null
          created_at: string
          domain: string | null
          experience_years: number | null
          id: string
          is_active: boolean | null
          name: string
          persona_md: string | null
          region: string
          updated_at: string
          version: number | null
          work_md: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          domain?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          persona_md?: string | null
          region: string
          updated_at?: string
          version?: number | null
          work_md?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          domain?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          persona_md?: string | null
          region?: string
          updated_at?: string
          version?: number | null
          work_md?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          badge: string | null
          client: string | null
          contribution_score: number | null
          created_at: string
          full_name: string | null
          id: string
          region: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          badge?: string | null
          client?: string | null
          contribution_score?: number | null
          created_at?: string
          full_name?: string | null
          id: string
          region?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          badge?: string | null
          client?: string | null
          contribution_score?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          region?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      repair_videos: {
        Row: {
          created_at: string
          id: string
          machine_id: string | null
          sop_steps: Json | null
          status: string | null
          storage_path: string | null
          summary: string | null
          updated_at: string
          wo_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          machine_id?: string | null
          sop_steps?: Json | null
          status?: string | null
          storage_path?: string | null
          summary?: string | null
          updated_at?: string
          wo_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          machine_id?: string | null
          sop_steps?: Json | null
          status?: string | null
          storage_path?: string | null
          summary?: string | null
          updated_at?: string
          wo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_videos_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_videos_wo_id_fkey"
            columns: ["wo_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          badge: string | null
          city: string | null
          client: string | null
          contribution_score: number | null
          created_at: string
          experience_years: number | null
          full_name: string
          id: string
          region: string | null
          updated_at: string
        }
        Insert: {
          badge?: string | null
          city?: string | null
          client?: string | null
          contribution_score?: number | null
          created_at?: string
          experience_years?: number | null
          full_name: string
          id?: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          badge?: string | null
          city?: string | null
          client?: string | null
          contribution_score?: number | null
          created_at?: string
          experience_years?: number | null
          full_name?: string
          id?: string
          region?: string | null
          updated_at?: string
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
      work_order_parts: {
        Row: {
          created_at: string
          id: string
          part_name: string
          part_no: string | null
          probability: number | null
          stock_count: number | null
          stock_status: string | null
          updated_at: string
          wo_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          part_name: string
          part_no?: string | null
          probability?: number | null
          stock_count?: number | null
          stock_status?: string | null
          updated_at?: string
          wo_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          part_name?: string
          part_no?: string | null
          probability?: number | null
          stock_count?: number | null
          stock_status?: string | null
          updated_at?: string
          wo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_wo_id_fkey"
            columns: ["wo_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          alarm_code: string | null
          assigned_technician_id: string | null
          badge: string | null
          city: string | null
          client: string | null
          closed_at: string | null
          closing_notes: Json | null
          code: string
          complaint: string | null
          created_at: string
          description: string | null
          district: string | null
          evidence_photo_urls: Json | null
          id: string
          machine_id: string | null
          region: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          alarm_code?: string | null
          assigned_technician_id?: string | null
          badge?: string | null
          city?: string | null
          client?: string | null
          closed_at?: string | null
          closing_notes?: Json | null
          code: string
          complaint?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          evidence_photo_urls?: Json | null
          id?: string
          machine_id?: string | null
          region?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          alarm_code?: string | null
          assigned_technician_id?: string | null
          badge?: string | null
          city?: string | null
          client?: string | null
          closed_at?: string | null
          closing_notes?: Json | null
          code?: string
          complaint?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          evidence_photo_urls?: Json | null
          id?: string
          machine_id?: string | null
          region?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_region: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "technician"
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
      app_role: ["admin", "supervisor", "technician"],
    },
  },
} as const
