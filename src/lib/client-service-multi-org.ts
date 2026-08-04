import { supabase } from './supabase'
import { calculatePercentChange, countExistedByEndOfLastMonth, getCalendarMonthBounds } from './stats-utils'
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
  status?: string
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
    change_from_last_month: number
  }> {
    const { data, error } = await supabase
      .from('clients')
      .select('id, created_at, status')
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error fetching client stats:', error)
      throw new Error('Failed to fetch client statistics')
    }

    const clients = data || []
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { endOfLastMonth } = getCalendarMonthBounds(now)
    const lastMonthTotal = countExistedByEndOfLastMonth(clients)

    return {
      total_clients: clients.length,
      active_clients: clients.filter((client) => client.status === 'active').length,
      recent_clients: clients.filter((client) => new Date(client.created_at) > thirtyDaysAgo).length,
      change_from_last_month: calculatePercentChange(clients.length, lastMonthTotal),
    }
  }

  // Get users for the organization (admin/manager only)
  static async getUsers(organizationId: string): Promise<any[]> {
    try {
      const { data: userOrgData, error: userOrgError } = await supabase
        .from('organization_members')
        .select('user_id, role, joined_at')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (userOrgError) {
        console.error('Error fetching organization_members:', userOrgError)
        throw userOrgError
      }

      if (!userOrgData?.length) {
        return []
      }

      const userIds = userOrgData.map(item => item.user_id)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, created_at, last_login_at, is_active')
        .in('id', userIds)
        .eq('is_active', true)
        .order('first_name', { ascending: true })

      if (usersError) {
        console.error('Error fetching users:', usersError)
        throw usersError
      }

      return (usersData || []).map(user => {
        const userOrg = userOrgData.find(uo => uo.user_id === user.id)
        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          role: userOrg?.role || 'employee',
          created_at: user.created_at,
          last_login_at: user.last_login_at,
          joined_at: userOrg?.joined_at,
        }
      })
    } catch (error) {
      console.error('Error fetching users:', error)
      throw new Error('Failed to fetch users')
    }
  }

  // Block a client (do not contact) - ALWAYS filtered by organization
  static async blockClient(id: string, reason: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({
        is_blocked: true,
        block_reason: reason,
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error blocking client:', error)
      throw new Error('Failed to block client')
    }
  }

  // Unblock a client - ALWAYS filtered by organization
  static async unblockClient(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({
        is_blocked: false,
        block_reason: null,
        blocked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error unblocking client:', error)
      throw new Error('Failed to unblock client')
    }
  }

  static async grantCrmAccess(userId: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ role: 'manager' })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('role', 'employee')

    if (error) {
      console.error('Error granting CRM access:', error)
      throw new Error('Failed to grant CRM access')
    }
  }

  static async revokeCrmAccess(userId: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ role: 'employee' })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('role', 'manager')

    if (error) {
      console.error('Error revoking CRM access:', error)
      throw new Error('Failed to revoke CRM access')
    }
  }
}
