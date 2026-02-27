export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ingredient_aliases: {
        Row: {
          alias: string
          auto_generated: boolean | null
          created_at: string | null
          ingredient_id: string
        }
        Insert: {
          alias: string
          auto_generated?: boolean | null
          created_at?: string | null
          ingredient_id: string
        }
        Update: {
          alias?: string
          auto_generated?: boolean | null
          created_at?: string | null
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_aliases_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category: string
          created_at: string | null
          id: string
          name: string
          needs_review: boolean | null
          parent_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          name: string
          needs_review?: boolean | null
          parent_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          name?: string
          needs_review?: boolean | null
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          ingredient_id: string
          is_main: boolean | null
          recipe_id: string
        }
        Insert: {
          ingredient_id: string
          is_main?: boolean | null
          recipe_id: string
        }
        Update: {
          ingredient_id?: string
          is_main?: boolean | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cooking_time_minutes: number | null
          created_at: string | null
          embedding_generated_at: string | null
          embedding_retry_count: number | null
          id: string
          image_url: string | null
          ingredients_linked: boolean | null
          ingredients_raw: Json | null
          last_viewed_at: string | null
          memo: string | null
          source_name: string | null
          tags: string[] | null
          title: string
          title_embedding: string | null
          updated_at: string | null
          url: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          cooking_time_minutes?: number | null
          created_at?: string | null
          embedding_generated_at?: string | null
          embedding_retry_count?: number | null
          id?: string
          image_url?: string | null
          ingredients_linked?: boolean | null
          ingredients_raw?: Json | null
          last_viewed_at?: string | null
          memo?: string | null
          source_name?: string | null
          tags?: string[] | null
          title: string
          title_embedding?: string | null
          updated_at?: string | null
          url: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          cooking_time_minutes?: number | null
          created_at?: string | null
          embedding_generated_at?: string | null
          embedding_retry_count?: number | null
          id?: string
          image_url?: string | null
          ingredients_linked?: boolean | null
          ingredients_raw?: Json | null
          last_viewed_at?: string | null
          memo?: string | null
          source_name?: string | null
          tags?: string[] | null
          title?: string
          title_embedding?: string | null
          updated_at?: string | null
          url?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      unmatched_ingredients: {
        Row: {
          created_at: string | null
          id: string
          normalized_name: string
          raw_name: string
          recipe_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          normalized_name: string
          raw_name: string
          recipe_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          normalized_name?: string
          raw_name?: string
          recipe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unmatched_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          line_user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          line_user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          line_user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_frequent_ingredients: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          id: string
          name: string
          recipe_count: number
        }[]
      }
      get_recipes_few_ingredients: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          id: string
          image_url: string
          source_name: string
          title: string
          url: string
        }[]
      }
      get_recipes_short_cooking_time: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          id: string
          image_url: string
          source_name: string
          title: string
          url: string
        }[]
      }
      get_unmatched_ingredient_counts: {
        Args: { limit_count?: number }
        Returns: {
          count: number
          normalized_name: string
        }[]
      }
      search_recipes_by_embedding: {
        Args: {
          p_match_count?: number
          p_match_threshold?: number
          p_query_embedding: string
          p_user_id: string
        }
        Returns: {
          id: string
          image_url: string
          memo: string
          similarity: number
          source_name: string
          title: string
          url: string
        }[]
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

