export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type AppStatus =
  | 'saved'
  | 'applied'
  | 'phone_screen'
  | 'technical'
  | 'onsite'
  | 'offer'
  | 'accepted'
  | 'rejected'

export type WorkType = 'remote' | 'hybrid' | 'onsite'

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
      job_applications: {
        Row: {
          id: string
          user_id: string
          url: string | null
          job_description: string
          company: string | null
          role: string | null
          location: string | null
          work_type: WorkType | null
          salary_min: number | null
          salary_max: number | null
          salary_currency: string
          h1_sponsor: boolean | null
          requirements: string[] | null
          deadline: string | null
          status: AppStatus
          ai_extracted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url?: string | null
          job_description: string
          company?: string | null
          role?: string | null
          location?: string | null
          work_type?: WorkType | null
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string
          h1_sponsor?: boolean | null
          requirements?: string[] | null
          deadline?: string | null
          status?: AppStatus
          ai_extracted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          url?: string | null
          job_description?: string
          company?: string | null
          role?: string | null
          location?: string | null
          work_type?: WorkType | null
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string
          h1_sponsor?: boolean | null
          requirements?: string[] | null
          deadline?: string | null
          status?: AppStatus
          ai_extracted?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      application_notes: {
        Row: {
          id: string
          application_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          application_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: []
      }
      fetch_logs: {
        Row: {
          id: string
          application_id: string | null
          user_id: string
          url: string
          status: 'success' | 'failed'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id?: string | null
          user_id: string
          url: string
          status: 'success' | 'failed'
          error_message?: string | null
          created_at?: string
        }
        Update: never
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
export type JobApplication = Database['public']['Tables']['job_applications']['Row']
export type ApplicationNote = Database['public']['Tables']['application_notes']['Row']
export type FetchLog = Database['public']['Tables']['fetch_logs']['Row']
