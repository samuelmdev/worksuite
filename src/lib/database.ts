import { supabase } from './supabase'
import { Database } from './supabase'

// Type helpers
type Tables = Database['public']['Tables']
type TableName = keyof Tables

// Generic database operations
export class DatabaseService {
  // Get all records from a table
  static async getAll<T extends TableName>(table: T) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
    
    if (error) throw error
    return data as Tables[T]['Row'][]
  }

  // Get a single record by ID
  static async getById<T extends TableName>(table: T, id: string) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Tables[T]['Row']
  }

  // Create a new record
  static async create<T extends TableName>(
    table: T, 
    record: Tables[T]['Insert']
  ) {
    const { data, error } = await supabase
      .from(table)
      .insert(record)
      .select()
      .single()
    
    if (error) throw error
    return data as Tables[T]['Row']
  }

  // Update a record
  static async update<T extends TableName>(
    table: T, 
    id: string, 
    updates: Tables[T]['Update']
  ) {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Tables[T]['Row']
  }

  // Delete a record
  static async delete<T extends TableName>(table: T, id: string) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Organization-specific operations
export class OrganizationService {
  static async getCurrentUserOrganization() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('users')
      .select(`
        organization_id,
        organizations (*)
      `)
      .eq('id', user.id)
      .single()

    if (error) throw error
    return data
  }

  static async getOrganizationUsers(organizationId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId)

    if (error) throw error
    return data
  }
}

// Client operations
export class ClientService {
  static async getClients(organizationId: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async createClient(client: Tables['clients']['Insert']) {
    return DatabaseService.create('clients', client)
  }

  static async updateClient(id: string, updates: Tables['clients']['Update']) {
    return DatabaseService.update('clients', id, updates)
  }

  static async deleteClient(id: string) {
    return DatabaseService.delete('clients', id)
  }
}

// Time entry operations
export class TimeEntryService {
  static async getTimeEntries(organizationId: string, userId?: string) {
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        clients (name),
        projects (name)
      `)
      .eq('organization_id', organizationId)
      .order('start_time', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async createTimeEntry(entry: Tables['time_entries']['Insert']) {
    return DatabaseService.create('time_entries', entry)
  }

  static async updateTimeEntry(id: string, updates: Tables['time_entries']['Update']) {
    return DatabaseService.update('time_entries', id, updates)
  }

  static async deleteTimeEntry(id: string) {
    return DatabaseService.delete('time_entries', id)
  }
}

// Project operations
export class ProjectService {
  static async getProjects(organizationId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_clients (
          clients (name)
        ),
        project_employees (
          users (first_name, last_name)
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async createProject(project: Tables['projects']['Insert']) {
    return DatabaseService.create('projects', project)
  }

  static async updateProject(id: string, updates: Tables['projects']['Update']) {
    return DatabaseService.update('projects', id, updates)
  }

  static async deleteProject(id: string) {
    return DatabaseService.delete('projects', id)
  }
}
