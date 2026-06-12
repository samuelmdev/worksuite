import { supabase } from './supabase'
import { Database } from './supabase'

type Client = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']
type ClientUpdate = Database['public']['Tables']['clients']['Update']
type User = Database['public']['Tables']['users']['Row']

export interface ClientFormData {
  name: string
  email: string
  phone: string
  company: string
  address: string
  notes: string
}

export class ClientService {
  // Get all clients for the current user's organization
  static async getClients(): Promise<Client[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user's organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (userError) throw userError
      if (!userData) throw new Error('User not found')

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching clients:', error)
        throw error
      }
      
      return data || []
    } catch (error) {
      console.error('ClientService.getClients error:', error)
      throw error
    }
  }

  // Get a single client by ID
  static async getClient(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows returned
      throw error
    }
    return data
  }

  // Create a new client
  static async createClient(clientData: ClientFormData, status: 'active' | 'lead' = 'active'): Promise<Client> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    const insertData: ClientInsert = {
      organization_id: userData.organization_id,
      name: clientData.name,
      email: clientData.email,
      phone: clientData.phone,
      company: clientData.company,
      address: clientData.address,
      notes: clientData.notes,
      created_by: user.id,
      status: status
    }

    const { data, error } = await supabase
      .from('clients')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Update an existing client
  static async updateClient(id: string, clientData: ClientFormData): Promise<Client> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const updateData: ClientUpdate = {
      name: clientData.name,
      email: clientData.email,
      phone: clientData.phone,
      company: clientData.company,
      address: clientData.address,
      notes: clientData.notes,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Delete a client
  static async deleteClient(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Search clients
  static async searchClients(query: string): Promise<Client[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Get client statistics
  static async getClientStats(): Promise<{
    total: number
    active: number
    recent: number
    changeFromLastMonth: number
  }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000))
    

    const { data, error } = await supabase
      .from('clients')
      .select('status, created_at')
      .eq('organization_id', userData.organization_id)

    if (error) throw error

    const total = data?.length || 0
    const active = data?.filter(c => c.status === 'active').length || 0
    const recent = data?.filter(c => new Date(c.created_at) > thirtyDaysAgo).length || 0
    
    // Calculate change from last month (30-60 days ago vs 0-30 days ago)
    // Focus on active clients for meaningful business metrics
    const lastMonthActiveClients = data?.filter(c => {
      const created = new Date(c.created_at)
      return created > sixtyDaysAgo && created <= thirtyDaysAgo && c.status === 'active'
    }).length || 0
    
    const thisMonthActiveClients = data?.filter(c => {
      const created = new Date(c.created_at)
      return created > thirtyDaysAgo && c.status === 'active'
    }).length || 0

    // Calculate percentage change based on active clients
    let changeFromLastMonth = 0
    if (lastMonthActiveClients > 0) {
      changeFromLastMonth = Math.round(((thisMonthActiveClients - lastMonthActiveClients) / lastMonthActiveClients) * 100)
    } else if (thisMonthActiveClients > 0) {
      changeFromLastMonth = 100 // 100% increase if no active clients last month but some this month
    }
    

    const stats = {
      total,
      active,
      recent,
      changeFromLastMonth
    }

    return stats
  }

  // Block a client
  static async blockClient(id: string, reason: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          is_blocked: true,
          block_reason: reason,
          blocked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error blocking client:', error)
        throw error
      }
    } catch (error) {
      console.error('ClientService.blockClient error:', error)
      throw error
    }
  }

  // Unblock a client
  static async unblockClient(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          is_blocked: false,
          block_reason: null,
          blocked_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error unblocking client:', error)
        throw error
      }
    } catch (error) {
      console.error('ClientService.unblockClient error:', error)
      throw error
    }
  }

  // Get blocked clients
  static async getBlockedClients(): Promise<Client[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user's organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (userError) throw userError
      if (!userData) throw new Error('User not found')

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .eq('is_blocked', true)
        .order('blocked_at', { ascending: false })

      if (error) {
        console.error('Error fetching blocked clients:', error)
        throw error
      }
      
      return data || []
    } catch (error) {
      console.error('ClientService.getBlockedClients error:', error)
      throw error
    }
  }

  // Update client status based on contracts
  static async updateClientStatusBasedOnContracts(clientId: string): Promise<void> {
    try {
      // Get client's contracts
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('status')
        .eq('client_id', clientId)

      if (contractsError) throw contractsError

      // Check if client has any active contracts
      const hasActiveContracts = contracts?.some(c => c.status === 'active') || false

      // Get current client status
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('status')
        .eq('id', clientId)
        .single()

      if (clientError) throw clientError

      // Only update if client was previously active and now has no active contracts
      // Don't update if client is archived, blocked, lead, etc.
      if (client.status === 'active' && !hasActiveContracts) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ 
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId)

        if (updateError) throw updateError
        console.log(`Client ${clientId} status updated to 'inactive' - no active contracts`)
      } else if (!hasActiveContracts && client.status !== 'active') {
        // If client has active contracts and status is not active, update to active
        const { error: updateError } = await supabase
          .from('clients')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId)

        if (updateError) throw updateError
        console.log(`Client ${clientId} status updated to 'active' - has active contracts`)
      }
    } catch (error) {
      console.error('Error updating client status based on contracts:', error)
      throw error
    }
  }

  // Get all users for the current user's organization
  static async getUsers(): Promise<User[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user's organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (userError) throw userError
      if (!userData) throw new Error('User not found')

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        throw error
      }
      
      return data || []
    } catch (error) {
      console.error('ClientService.getUsers error:', error)
      throw error
    }
  }
}
