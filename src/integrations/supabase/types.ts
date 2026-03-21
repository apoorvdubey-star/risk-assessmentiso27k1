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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          risk_matrix_type: string
          risk_reduction_percent: number
          risk_threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          risk_matrix_type?: string
          risk_reduction_percent?: number
          risk_threshold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          risk_matrix_type?: string
          risk_reduction_percent?: number
          risk_threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_id: string
          asset_name: string
          asset_owner: string | null
          asset_type: Database["public"]["Enums"]["asset_type"]
          availability: number
          confidentiality: number
          created_at: string
          criticality_approved: boolean
          criticality_approved_by: string | null
          criticality_score: number | null
          data_classification: string | null
          department: string | null
          description: string | null
          id: string
          integrity: number
          is_critical: boolean | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          asset_name: string
          asset_owner?: string | null
          asset_type?: Database["public"]["Enums"]["asset_type"]
          availability?: number
          confidentiality?: number
          created_at?: string
          criticality_approved?: boolean
          criticality_approved_by?: string | null
          criticality_score?: number | null
          data_classification?: string | null
          department?: string | null
          description?: string | null
          id?: string
          integrity?: number
          is_critical?: boolean | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          asset_name?: string
          asset_owner?: string | null
          asset_type?: Database["public"]["Enums"]["asset_type"]
          availability?: number
          confidentiality?: number
          created_at?: string
          criticality_approved?: boolean
          criticality_approved_by?: string | null
          criticality_score?: number | null
          data_classification?: string | null
          department?: string | null
          description?: string | null
          id?: string
          integrity?: number
          is_critical?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      controls: {
        Row: {
          control_category: Database["public"]["Enums"]["control_category"]
          control_description: string
          control_id: string
          control_name: string
          id: string
        }
        Insert: {
          control_category: Database["public"]["Enums"]["control_category"]
          control_description?: string
          control_id: string
          control_name: string
          id?: string
        }
        Update: {
          control_category?: Database["public"]["Enums"]["control_category"]
          control_description?: string
          control_id?: string
          control_name?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          department?: string
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          department?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      risks: {
        Row: {
          consequence: string | null
          control_effectiveness: Database["public"]["Enums"]["control_effectiveness"]
          created_at: string
          existing_control_ids: string[] | null
          expected_closure_date: string | null
          id: string
          impact: number
          likelihood: number
          linked_asset_id: string
          management_decision:
            | Database["public"]["Enums"]["management_decision"]
            | null
          remarks: string | null
          resultant_risk: number
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_owner: string | null
          risk_scenario: string | null
          risk_score: number | null
          status: Database["public"]["Enums"]["risk_status"]
          threat: string
          updated_at: string
          vulnerability: string
        }
        Insert: {
          consequence?: string | null
          control_effectiveness?: Database["public"]["Enums"]["control_effectiveness"]
          created_at?: string
          existing_control_ids?: string[] | null
          expected_closure_date?: string | null
          id?: string
          impact?: number
          likelihood?: number
          linked_asset_id: string
          management_decision?:
            | Database["public"]["Enums"]["management_decision"]
            | null
          remarks?: string | null
          resultant_risk?: number
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_owner?: string | null
          risk_scenario?: string | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["risk_status"]
          threat: string
          updated_at?: string
          vulnerability: string
        }
        Update: {
          consequence?: string | null
          control_effectiveness?: Database["public"]["Enums"]["control_effectiveness"]
          created_at?: string
          existing_control_ids?: string[] | null
          expected_closure_date?: string | null
          id?: string
          impact?: number
          likelihood?: number
          linked_asset_id?: string
          management_decision?:
            | Database["public"]["Enums"]["management_decision"]
            | null
          remarks?: string | null
          resultant_risk?: number
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_owner?: string | null
          risk_scenario?: string | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["risk_status"]
          threat?: string
          updated_at?: string
          vulnerability?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_linked_asset_id_fkey"
            columns: ["linked_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_users: {
        Args: never
        Returns: {
          department: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      handle_signup: {
        Args: { _department?: string; _full_name?: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "risk_owner" | "user"
      asset_type:
        | "Hardware"
        | "Software"
        | "Service"
        | "People"
        | "Data"
        | "Others"
      control_category:
        | "Organizational"
        | "People"
        | "Physical"
        | "Technological"
      control_effectiveness: "Effective" | "Not Effective" | "NA"
      management_decision: "Avoid" | "Mitigate" | "Transfer" | "Accept"
      risk_level: "Low" | "Medium" | "High" | "Critical"
      risk_status: "Open" | "Closed" | "WIP"
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
      app_role: ["admin", "risk_owner", "user"],
      asset_type: [
        "Hardware",
        "Software",
        "Service",
        "People",
        "Data",
        "Others",
      ],
      control_category: [
        "Organizational",
        "People",
        "Physical",
        "Technological",
      ],
      control_effectiveness: ["Effective", "Not Effective", "NA"],
      management_decision: ["Avoid", "Mitigate", "Transfer", "Accept"],
      risk_level: ["Low", "Medium", "High", "Critical"],
      risk_status: ["Open", "Closed", "WIP"],
    },
  },
} as const
