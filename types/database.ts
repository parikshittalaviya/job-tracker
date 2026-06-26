export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          anthropic_key: string | null
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          anthropic_key?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          anthropic_key?: string | null
          role?: 'user' | 'admin'
          updated_at?: string
        }
        Relationships: []
      }
      tailoring_usage: {
        Row: {
          id: string
          user_id: string
          usage_date: string
          count: number
        }
        Insert: {
          id?: string
          user_id: string
          usage_date?: string
          count?: number
        }
        Update: {
          count?: number
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type TailoringUsage = Database['public']['Tables']['tailoring_usage']['Row']
