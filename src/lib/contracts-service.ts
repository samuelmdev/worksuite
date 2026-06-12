import { supabase } from './supabase'
import { Database } from './supabase'

export type Contract = Database['public']['Tables']['contracts']['Row'] & {
  clients?: {
    name: string
    company: string
  }
}
type ContractInsert = Database['public']['Tables']['contracts']['Insert']
type ContractUpdate = Database['public']['Tables']['contracts']['Update']

export interface ContractFormData {
  name: string
  description: string
  type: 'monthly' | 'yearly' | 'one_time' | 'hourly' | 'project'
  status: 'active' | 'inactive' | 'expired' | 'cancelled' | 'pending'
  value: number
  monthly_value?: number
  currency: string
  start_date: string
  end_date?: string | undefined
  auto_renewal: boolean
  billing_frequency: 'monthly' | 'yearly' | 'one_time' | 'quarterly'
  next_billing_date?: string | undefined
  client_id?: string
  assigned_to?: string
  notes?: string
  terms?: string
}

export class ContractsService {
  // Get all contracts for the current user's organization
  static async getContracts(): Promise<Contract[]> {
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
      .from('contracts')
      .select(`
        *,
        clients!inner(name, company)
      `)
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Get contract statistics
  static async getContractStats(): Promise<{
    total: number
    active: number
    recent: number
    changeFromLastMonth: number
    monthlyRevenue: number
    monthlyRevenueChange: number
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
      .from('contracts')
      .select('status, created_at, monthly_value, type, value')
      .eq('organization_id', userData.organization_id)

    if (error) throw error

    const total = data?.length || 0
    const active = data?.filter(c => c.status === 'active').length || 0
    const recent = data?.filter(c => new Date(c.created_at) > thirtyDaysAgo).length || 0

    // Calculate change from last month for active contracts
    const lastMonthActiveContracts = data?.filter(c => {
      const created = new Date(c.created_at)
      return created > sixtyDaysAgo && created <= thirtyDaysAgo && c.status === 'active'
    }).length || 0

    const thisMonthActiveContracts = data?.filter(c => {
      const created = new Date(c.created_at)
      return created > thirtyDaysAgo && c.status === 'active'
    }).length || 0

    // Calculate percentage change for contracts
    let changeFromLastMonth = 0
    if (lastMonthActiveContracts > 0) {
      changeFromLastMonth = Math.round(((thisMonthActiveContracts - lastMonthActiveContracts) / lastMonthActiveContracts) * 100)
    } else if (thisMonthActiveContracts > 0) {
      changeFromLastMonth = 100
    }

    // Calculate monthly recurring revenue (MRR)
    const monthlyRevenue = data?.filter(c => 
      c.status === 'active' && 
      (c.type === 'monthly' || c.billing_frequency === 'monthly')
    ).reduce((sum, c) => sum + (c.monthly_value || 0), 0) || 0

    // Calculate MRR change from last month
    const lastMonthMRR = data?.filter(c => {
      const created = new Date(c.created_at)
      return created > sixtyDaysAgo && 
             created <= thirtyDaysAgo && 
             c.status === 'active' && 
             (c.type === 'monthly' || c.billing_frequency === 'monthly')
    }).reduce((sum, c) => sum + (c.monthly_value || 0), 0) || 0

    const thisMonthMRR = data?.filter(c => {
      const created = new Date(c.created_at)
      return created > thirtyDaysAgo && 
             c.status === 'active' && 
             (c.type === 'monthly' || c.billing_frequency === 'monthly')
    }).reduce((sum, c) => sum + (c.monthly_value || 0), 0) || 0

    let monthlyRevenueChange = 0
    if (lastMonthMRR > 0) {
      monthlyRevenueChange = Math.round(((thisMonthMRR - lastMonthMRR) / lastMonthMRR) * 100)
    } else if (thisMonthMRR > 0) {
      monthlyRevenueChange = 100
    }

    return {
      total,
      active,
      recent,
      changeFromLastMonth,
      monthlyRevenue,
      monthlyRevenueChange
    }
  }

  // Create a new contract
  static async createContract(contractData: ContractFormData): Promise<Contract> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Validate required fields
    if (!contractData.client_id) {
      throw new Error('Client ID is required')
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    const insertData: ContractInsert = {
      organization_id: userData.organization_id,
      client_id: contractData.client_id,
      name: contractData.name,
      description: contractData.description,
      type: contractData.type,
      status: contractData.status,
      value: contractData.value,
      monthly_value: contractData.monthly_value,
      currency: contractData.currency,
      start_date: contractData.start_date,
      end_date: contractData.end_date,
      auto_renewal: contractData.auto_renewal,
      billing_frequency: contractData.billing_frequency,
      next_billing_date: contractData.next_billing_date,
      assigned_to: contractData.assigned_to,
      created_by: user.id,
      notes: contractData.notes,
      terms: contractData.terms
    }

    const { data, error } = await supabase
      .from('contracts')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    // Update client status based on contracts
    if (contractData.client_id) {
      try {
        const { ClientService } = await import('./client-service')
        await ClientService.updateClientStatusBasedOnContracts(contractData.client_id)
      } catch (error) {
        console.error('Error updating client status after contract creation:', error)
      }
    }

    return data
  }

  // Update an existing contract
  static async updateContract(id: string, contractData: Partial<ContractFormData>): Promise<Contract> {
    // Get the current contract to find the client_id
    const { data: currentContract, error: fetchError } = await supabase
      .from('contracts')
      .select('client_id')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const updateData: ContractUpdate = {
      ...contractData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update client status based on contracts
    if (currentContract?.client_id) {
      try {
        const { ClientService } = await import('./client-service')
        await ClientService.updateClientStatusBasedOnContracts(currentContract.client_id)
      } catch (error) {
        console.error('Error updating client status after contract update:', error)
      }
    }

    return data
  }

  // Delete a contract
  static async deleteContract(id: string): Promise<void> {
    // Get the current contract to find the client_id before deleting
    const { data: currentContract, error: fetchError } = await supabase
      .from('contracts')
      .select('client_id')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Update client status based on contracts
    if (currentContract?.client_id) {
      try {
        const { ClientService } = await import('./client-service')
        await ClientService.updateClientStatusBasedOnContracts(currentContract.client_id)
      } catch (error) {
        console.error('Error updating client status after contract deletion:', error)
      }
    }
  }
}
