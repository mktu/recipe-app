export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          line_user_id: string
          display_name: string
          created_at: string
        }
        Insert: {
          id?: string
          line_user_id: string
          display_name: string
          created_at?: string
        }
        Update: {
          id?: string
          line_user_id?: string
          display_name?: string
          created_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          user_id: string
          title: string
          url: string
          source_name: string | null
          ingredients_raw: Json
          tags: string[]
          image_url: string | null
          memo: string | null
          view_count: number
          last_viewed_at: string | null
          created_at: string
          updated_at: string
          ingredients_linked: boolean
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          url: string
          source_name?: string | null
          ingredients_raw?: Json
          tags?: string[]
          image_url?: string | null
          memo?: string | null
          view_count?: number
          last_viewed_at?: string | null
          created_at?: string
          updated_at?: string
          ingredients_linked?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          url?: string
          source_name?: string | null
          ingredients_raw?: Json
          tags?: string[]
          image_url?: string | null
          memo?: string | null
          view_count?: number
          last_viewed_at?: string | null
          created_at?: string
          updated_at?: string
          ingredients_linked?: boolean
        }
      }
      ingredients: {
        Row: {
          id: string
          name: string
          category: string
          needs_review: boolean
          created_at: string
          parent_id: string | null
        }
        Insert: {
          id?: string
          name: string
          category: string
          needs_review?: boolean
          created_at?: string
          parent_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string
          needs_review?: boolean
          created_at?: string
          parent_id?: string | null
        }
      }
      ingredient_aliases: {
        Row: {
          alias: string
          ingredient_id: string
        }
        Insert: {
          alias: string
          ingredient_id: string
        }
        Update: {
          alias?: string
          ingredient_id?: string
        }
      }
      recipe_ingredients: {
        Row: {
          recipe_id: string
          ingredient_id: string
          is_main: boolean
        }
        Insert: {
          recipe_id: string
          ingredient_id: string
          is_main?: boolean
        }
        Update: {
          recipe_id?: string
          ingredient_id?: string
          is_main?: boolean
        }
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
  }
}

// ヘルパー型
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
