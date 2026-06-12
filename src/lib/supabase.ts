import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types (you can generate these with supabase gen types)
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          email: string | null
          phone: string | null
          address: string | null
          website: string | null
          logo_url: string | null
          settings: any
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          email?: string | null
          phone?: string | null
          address?: string | null
          website?: string | null
          logo_url?: string | null
          settings?: any
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          website?: string | null
          logo_url?: string | null
          settings?: any
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_id: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          role: string
          is_active: boolean
          last_login_at: string | null
          preferences: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          role?: string
          is_active?: boolean
          last_login_at?: string | null
          preferences?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          role?: string
          is_active?: boolean
          last_login_at?: string | null
          preferences?: any
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          organization_id: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          address: string | null
          website: string | null
          industry: string | null
          status: string
          source: string | null
          notes: string | null
          tags: string[] | null
          custom_fields: any
          assigned_to: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          address?: string | null
          website?: string | null
          industry?: string | null
          status?: string
          source?: string | null
          notes?: string | null
          tags?: string[] | null
          custom_fields?: any
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          address?: string | null
          website?: string | null
          industry?: string | null
          status?: string
          source?: string | null
          notes?: string | null
          tags?: string[] | null
          custom_fields?: any
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          name: string
          description: string | null
          type: string
          status: string
          value: number
          monthly_value: number | null
          currency: string
          start_date: string
          end_date: string | null
          auto_renewal: boolean
          billing_frequency: string
          next_billing_date: string | null
          assigned_to: string | null
          created_by: string | null
          notes: string | null
          terms: string | null
          custom_fields: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          name: string
          description?: string | null
          type: string
          status?: string
          value: number
          monthly_value?: number | null
          currency?: string
          start_date: string
          end_date?: string | null
          auto_renewal?: boolean
          billing_frequency?: string
          next_billing_date?: string | null
          assigned_to?: string | null
          created_by?: string | null
          notes?: string | null
          terms?: string | null
          custom_fields?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          name?: string
          description?: string | null
          type?: string
          status?: string
          value?: number
          monthly_value?: number | null
          currency?: string
          start_date?: string
          end_date?: string | null
          auto_renewal?: boolean
          billing_frequency?: string
          next_billing_date?: string | null
          assigned_to?: string | null
          created_by?: string | null
          notes?: string | null
          terms?: string | null
          custom_fields?: any
          created_at?: string
          updated_at?: string
        }
      }
      // Add more table types as needed
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
