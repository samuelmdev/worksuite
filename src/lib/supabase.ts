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
// Insert shapes are declared standalone so the Update variants can reuse them
// without indexing back into Database while Database is still being resolved.
export type ProjectInsert = {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  type?: string
  status?: string
  priority?: string | null
  progress?: number | null
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
  hourly_rate?: number | null
  route_notes?: string | null
  estimated_duration_hours?: number | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type ProjectClientInsert = {
  id?: string
  organization_id?: string | null
  project_id: string
  client_id: string
  created_at?: string
}

export type ProjectEmployeeInsert = {
  id?: string
  organization_id?: string | null
  project_id: string
  user_id: string
  role?: string | null
  hourly_rate?: number | null
  created_at?: string
  updated_at?: string
}

export type TimeEntryInsert = {
  id?: string
  organization_id: string
  user_id: string
  client_id?: string | null
  project_id?: string | null
  project_name?: string | null
  description: string
  start_time: string
  end_time?: string | null
  duration_minutes?: number | null
  billable_hours?: number | null
  hourly_rate?: number | null
  status?: 'draft' | 'submitted' | 'approved' | 'rejected'
  approved_by?: string | null
  approved_at?: string | null
  tags?: string[] | null
  created_at?: string
  updated_at?: string
}

export type PipelineItemInsert = {
  id?: string
  organization_id: string
  title: string
  type: 'lead' | 'deal'
  client_id?: string | null
  client_name?: string | null
  client_email?: string | null
  client_company?: string | null
  client_phone?: string | null
  value?: number
  stage?: string
  probability?: number
  expected_close_date?: string | null
  assigned_to?: string | null
  notes?: string | null
  source?: string | null
  is_archived?: boolean
  archived_at?: string | null
  is_blocked?: boolean
  block_reason?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type TaskInsert = {
  id?: string
  // Derived from client_id by a database trigger when omitted.
  organization_id?: string | null
  client_id?: string | null
  title: string
  description?: string | null
  task_type: string
  status?: string
  priority?: string
  due_date?: string | null
  is_scheduled?: boolean
  assigned_to?: string | null
  created_by: string
  completed_at?: string | null
  created_at?: string
  updated_at?: string
}

export type ClientActivityInsert = {
  id?: string
  organization_id?: string | null
  client_id: string
  user_id?: string | null
  type: string
  subject?: string | null
  description?: string | null
  scheduled_at?: string | null
  completed_at?: string | null
  status?: string
  created_at?: string
  updated_at?: string
}

export type ActivityLogInsert = {
  id?: string
  organization_id?: string | null
  user_id?: string | null
  module: string
  entity_type: string
  entity_id: string
  action: string
  title: string
  description?: string | null
  old_values?: any
  new_values?: any
  created_at?: string
}

export type SubscriptionPlanRow = {
  id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number | null
  price_yearly: number | null
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  has_crm_access: boolean
  has_time_tracking_access: boolean
  has_advanced_reports: boolean
  has_api_access: boolean
  has_priority_support: boolean
  additional_features: any
  max_users: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type OrganizationSubscriptionInsert = {
  id?: string
  organization_id: string
  plan_id?: string | null
  status: string
  stripe_subscription_id?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
  cancelled_at?: string | null
  trial_ends_at?: string | null
  created_at?: string
  updated_at?: string
}

export type FinanceTransactionInsert = {
  id?: string
  organization_id: string
  direction: 'in' | 'out'
  amount: number
  currency?: string
  occurred_on: string
  description: string
  reference?: string | null
  category_id?: string | null
  source_type?: string
  source_id?: string | null
  created_by?: string | null
  created_at?: string
}

export type BillingHistoryInsert = {
  id?: string
  organization_id: string
  subscription_id?: string | null
  stripe_invoice_id?: string | null
  amount: number
  currency?: string
  status: string
  invoice_url?: string | null
  paid_at?: string | null
  created_at?: string
}

export type InvoiceInsert = {
  id?: string
  organization_id: string
  client_id?: string | null
  invoice_number: string
  issue_date: string
  due_date: string
  status?: string
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total?: number
  currency?: string
  notes?: string | null
  paid_at?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type ProjectRow = {
  id: string
  organization_id: string
  name: string
  description: string | null
  type: string
  status: string
  priority: string | null
  progress: number | null
  start_date: string | null
  end_date: string | null
  budget: number | null
  hourly_rate: number | null
  route_notes: string | null
  estimated_duration_hours: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * postgrest-js requires every table and view to carry a `Relationships` entry.
 * None of the embedded-resource helpers are typed here, so an empty tuple is
 * added structurally rather than repeated on all seventeen definitions.
 */
type WithRelationships<T> = { [K in keyof T]: T[K] & { Relationships: [] } }

export type Database = {
  public: {
    Tables: WithRelationships<{
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
          email: string | null
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
          organization_id?: string
          email?: string | null
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
          email?: string | null
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
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'admin' | 'manager' | 'sales_rep' | 'employee'
          is_active: boolean
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'admin' | 'manager' | 'sales_rep' | 'employee'
          is_active?: boolean
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'admin' | 'manager' | 'sales_rep' | 'employee'
          is_active?: boolean
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: ProjectRow
        Insert: ProjectInsert
        Update: Partial<ProjectInsert>
      }
      project_clients: {
        Row: {
          id: string
          organization_id: string | null
          project_id: string
          client_id: string
          created_at: string
        }
        Insert: ProjectClientInsert
        Update: Partial<ProjectClientInsert>
      }
      project_employees: {
        Row: {
          id: string
          organization_id: string | null
          project_id: string
          user_id: string
          role: string | null
          hourly_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: ProjectEmployeeInsert
        Update: Partial<ProjectEmployeeInsert>
      }
      time_entries: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          client_id: string | null
          project_id: string | null
          project_name: string | null
          description: string
          start_time: string
          end_time: string | null
          duration_minutes: number | null
          billable_hours: number | null
          hourly_rate: number | null
          status: 'draft' | 'submitted' | 'approved' | 'rejected'
          approved_by: string | null
          approved_at: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: TimeEntryInsert
        Update: Partial<TimeEntryInsert>
      }
      pipeline_items: {
        Row: {
          id: string
          organization_id: string
          title: string
          type: 'lead' | 'deal'
          client_id: string | null
          client_name: string | null
          client_email: string | null
          client_company: string | null
          client_phone: string | null
          value: number
          stage: string
          probability: number
          expected_close_date: string | null
          assigned_to: string | null
          notes: string | null
          source: string | null
          is_archived: boolean
          archived_at: string | null
          is_blocked: boolean
          block_reason: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: PipelineItemInsert
        Update: Partial<PipelineItemInsert>
      }
      tasks: {
        Row: {
          id: string
          organization_id: string | null
          client_id: string | null
          title: string
          description: string | null
          task_type: string
          status: string
          priority: string
          due_date: string | null
          is_scheduled: boolean
          assigned_to: string | null
          created_by: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: TaskInsert
        Update: Partial<TaskInsert>
      }
      client_activities: {
        Row: {
          id: string
          organization_id: string | null
          client_id: string
          user_id: string | null
          type: string
          subject: string | null
          description: string | null
          scheduled_at: string | null
          completed_at: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: ClientActivityInsert
        Update: Partial<ClientActivityInsert>
      }
      activity_logs: {
        Row: {
          id: string
          organization_id: string | null
          user_id: string | null
          module: string
          entity_type: string
          entity_id: string
          action: string
          title: string
          description: string | null
          old_values: any
          new_values: any
          created_at: string
        }
        Insert: ActivityLogInsert
        Update: Partial<ActivityLogInsert>
      }
      subscription_plans: {
        Row: SubscriptionPlanRow
        Insert: Partial<SubscriptionPlanRow> & { name: string; slug: string }
        Update: Partial<SubscriptionPlanRow>
      }
      organization_subscriptions: {
        Row: {
          id: string
          organization_id: string
          plan_id: string | null
          status: string
          stripe_subscription_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          cancelled_at: string | null
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: OrganizationSubscriptionInsert
        Update: Partial<OrganizationSubscriptionInsert>
      }
      billing_history: {
        Row: {
          id: string
          organization_id: string
          subscription_id: string | null
          stripe_invoice_id: string | null
          amount: number
          currency: string
          status: string
          invoice_url: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: BillingHistoryInsert
        Update: Partial<BillingHistoryInsert>
      }
      finance_categories: {
        Row: {
          id: string
          organization_id: string | null
          slug: string
          name: string
          direction: 'in' | 'out'
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          slug: string
          name: string
          direction: 'in' | 'out'
          is_system?: boolean
          created_at?: string
        }
        Update: Partial<{
          slug: string
          name: string
          direction: 'in' | 'out'
          is_system: boolean
        }>
      }
      finance_transactions: {
        Row: {
          id: string
          organization_id: string
          direction: 'in' | 'out'
          amount: number
          currency: string
          occurred_on: string
          description: string
          reference: string | null
          category_id: string | null
          source_type: string
          source_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: FinanceTransactionInsert
        Update: Partial<FinanceTransactionInsert>
      }
      invoices: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          invoice_number: string
          issue_date: string
          due_date: string
          status: string
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          currency: string
          notes: string | null
          paid_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: InvoiceInsert
        Update: Partial<InvoiceInsert>
      }
    }>
    Views: WithRelationships<{
      route_projects: {
        Row: ProjectRow & {
          organization_name: string
          assigned_clients_count: number
          assigned_employees_count: number
          client_names: string | null
          employee_names: string | null
        }
      }
    }>
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
