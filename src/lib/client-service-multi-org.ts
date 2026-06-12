import { supabase } from './supabase'
import { Database } from './supabase'

type Client = Database['public']['Tables']['clients']['Row']

export interface ClientFormData {
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  website?: string
  notes?: string
  organization_id: string // Required - must always be set
}

export class ClientService {
  // Get all clients - ALWAYS filtered by organization
  static async getClients(organizationId: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId) // Always filter by organization
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching clients:', error)
      throw new Error('Failed to fetch clients')
    }

    return data || []
  }

  // Get a single client by ID - ALWAYS filtered by organization
  static async getClient(id: string, organizationId: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId) // Ensure user can only access their org's clients
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Client not found
      }
      console.error('Error fetching client:', error)
      throw new Error('Failed to fetch client')
    }

    return data
  }

  // Create a new client - ALWAYS requires organization_id
  static async createClient(clientData: ClientFormData): Promise<Client> {
    // Validate that organization_id is provided
    if (!clientData.organization_id) {
      throw new Error('Organization ID is required for clients')
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      throw new Error('Failed to create client')
    }

    return data
  }

  // Update a client - organization_id cannot be changed
  static async updateClient(id: string, updates: Partial<ClientFormData>, organizationId: string): Promise<Client> {
    // Remove organization_id from updates if present (cannot be changed)
    const { organization_id, ...safeUpdates } = updates as any

    const { data, error } = await supabase
      .from('clients')
      .update(safeUpdates)
      .eq('id', id)
      .eq('organization_id', organizationId) // Ensure user can only update their org's clients
      .select()
      .single()

    if (error) {
      console.error('Error updating client:', error)
      throw new Error('Failed to update client')
    }

    return data
  }

  // Delete a client - ALWAYS filtered by organization
  static async deleteClient(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId) // Ensure user can only delete their org's clients

    if (error) {
      console.error('Error deleting client:', error)
      throw new Error('Failed to delete client')
    }
  }

  // Search clients - ALWAYS filtered by organization
  static async searchClients(query: string, organizationId: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId) // Always filter by organization
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error searching clients:', error)
      throw new Error('Failed to search clients')
    }

    return data || []
  }

  // Get client statistics - ALWAYS filtered by organization
  static async getClientStats(organizationId: string): Promise<{
    total_clients: number
    active_clients: number
    recent_clients: number
  }> {
    const { data, error } = await supabase
      .from('clients')
      .select('id, created_at')
      .eq('organization_id', organizationId) // Always filter by organization

    if (error) {
      console.error('Error fetching client stats:', error)
      throw new Error('Failed to fetch client statistics')
    }

    const clients = data || []
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      total_clients: clients.length,
      active_clients: clients.length, // All clients are considered active since there's no is_active column
      recent_clients: clients.filter(client => 
        new Date(client.created_at) > thirtyDaysAgo
      ).length
    }
  }

  // Get users for the organization (admin/manager only)
  static async getUsers(organizationId: string): Promise<any[]> {
    try {
      console.log('Fetching users for organization:', organizationId)
      
      // Try to get users from user_organizations table without foreign key relationship
      const { data: userOrgData, error: userOrgError } = await supabase
        .from('user_organizations')
        .select('user_id, role, joined_at')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (!userOrgError && userOrgData && userOrgData.length > 0) {
        console.log('Fetched user_organizations:', userOrgData.length)
        
        // Get user details for each user_id
        const userIds = userOrgData.map(item => item.user_id)
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, created_at')
          .in('id', userIds)
          .order('first_name', { ascending: true })

        if (!usersError && usersData) {
          // Combine user_organizations data with users data
          return usersData.map(user => {
            const userOrg = userOrgData.find(uo => uo.user_id === user.id)
            return {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              role: userOrg?.role || 'employee',
              created_at: user.created_at
            }
          })
        }
      }

      // Fallback: fetch all users (no organization filtering available)
      console.log('No user_organizations found, fetching all users...')
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, created_at')
        .order('first_name', { ascending: true })

      if (allUsersError) {
        console.error('Error fetching all users:', allUsersError)
        throw allUsersError
      }
      
      console.log('Fetched all users:', allUsers?.length || 0)
      return allUsers || []
    } catch (error) {
      console.error('Error fetching users:', error)
      throw new Error('Failed to fetch users')
    }
  }
}
