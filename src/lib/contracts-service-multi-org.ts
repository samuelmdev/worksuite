import { supabase } from './supabase'
import { Database } from './supabase'
import { calculatePercentChange, getCalendarMonthBounds } from './stats-utils'

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
  organization_id: string // Required - must always be set
}

export interface ContractStats {
  total_contracts: number
  active_contracts: number
  total_value: number
  monthly_recurring_revenue: number
  contracts_ending_soon: number
  average_contract_value: number
  active_contracts_change_from_last_month: number
  revenue_change_from_last_month: number
}

export class ContractsService {
  // Get all contracts for the organization
  static async getContracts(organizationId: string): Promise<Contract[]> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients(name, company)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('ContractsService: Error fetching contracts:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error fetching contracts:', error)
      throw new Error('Failed to fetch contracts')
    }
  }

  // Get contract statistics for the organization
  static async getContractStats(organizationId: string): Promise<ContractStats> {
    try {
      console.log('ContractsService: Fetching contract stats for organization:', organizationId)
      
      const { data, error } = await supabase
        .from('contracts')
        .select('status, type, value, monthly_value, end_date, created_at')
        .eq('organization_id', organizationId)

      if (error) {
        console.error('ContractsService: Error fetching contract stats:', error)
        throw error
      }

      console.log('ContractsService: Raw contract data:', data)

      const contracts = data || []
      const activeContracts = contracts.filter(c => c.status === 'active')
      const { endOfLastMonth } = getCalendarMonthBounds()

      const sumActiveMonthlyRevenue = (asOf?: Date) =>
        activeContracts
          .filter((contract) => {
            const createdAt = new Date(contract.created_at)
            if (asOf && createdAt > asOf) return false
            if (contract.end_date && asOf && new Date(contract.end_date) < asOf) return false
            return true
          })
          .reduce((sum, contract) => {
            const value = contract.monthly_value || contract.value || 0
            return sum + (typeof value === 'number' ? value : 0)
          }, 0)

      const currentMonthlyRevenue = sumActiveMonthlyRevenue()
      const lastMonthMonthlyRevenue = sumActiveMonthlyRevenue(endOfLastMonth)

      const currentActiveCount = activeContracts.length
      const lastMonthActiveCount = activeContracts.filter(
        (contract) => new Date(contract.created_at) <= endOfLastMonth
      ).length
      
      // Handle different possible field names for value
      const totalValue = contracts.reduce((sum, contract) => {
        const value = contract.value || contract.monthly_value || contract.total_value || 0
        return sum + (typeof value === 'number' ? value : 0)
      }, 0)
      
      const monthlyRecurring = currentMonthlyRevenue

      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const contractsEndingSoon = contracts.filter(c => {
        if (!c.end_date || c.status !== 'active') return false
        const endDate = new Date(c.end_date)
        return endDate <= thirtyDaysFromNow
      }).length

      const stats = {
        total_contracts: contracts.length,
        active_contracts: currentActiveCount,
        total_value: totalValue,
        monthly_recurring_revenue: monthlyRecurring,
        contracts_ending_soon: contractsEndingSoon,
        average_contract_value: contracts.length > 0 ? totalValue / contracts.length : 0,
        active_contracts_change_from_last_month: calculatePercentChange(
          currentActiveCount,
          lastMonthActiveCount
        ),
        revenue_change_from_last_month: calculatePercentChange(
          currentMonthlyRevenue,
          lastMonthMonthlyRevenue
        ),
      }

      console.log('ContractsService: Final contract stats:', stats)
      return stats
    } catch (error) {
      console.error('Error fetching contract stats:', error)
      throw new Error('Failed to fetch contract statistics')
    }
  }

  // Get a single contract by ID
  static async getContract(id: string, organizationId: string): Promise<Contract | null> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients!inner(name, company)
        `)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching contract:', error)
      throw new Error('Failed to fetch contract')
    }
  }

  // Create a new contract
  static async createContract(contractData: ContractFormData): Promise<Contract> {
    try {
      if (!contractData.organization_id) {
        throw new Error('Organization ID is required for contracts')
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      const insertData: ContractInsert = {
        organization_id: contractData.organization_id,
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
        .insert([insertData])
        .select(`
          *,
          clients!inner(name, company)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating contract:', error)
      throw new Error('Failed to create contract')
    }
  }

  // Update a contract
  static async updateContract(id: string, updates: Partial<ContractFormData>, organizationId: string): Promise<Contract> {
    try {
      // Remove organization_id from updates if present (cannot be changed)
      const { organization_id, ...safeUpdates } = updates as any

      const { data, error } = await supabase
        .from('contracts')
        .update(safeUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select(`
          *,
          clients!inner(name, company)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating contract:', error)
      throw new Error('Failed to update contract')
    }
  }

  // Delete a contract
  static async deleteContract(id: string, organizationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting contract:', error)
      throw new Error('Failed to delete contract')
    }
  }

  // Search contracts
  static async searchContracts(query: string, organizationId: string): Promise<Contract[]> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients!inner(name, company)
        `)
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching contracts:', error)
      throw new Error('Failed to search contracts')
    }
  }

  // Get contracts by status
  static async getContractsByStatus(status: string, organizationId: string): Promise<Contract[]> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients!inner(name, company)
        `)
        .eq('organization_id', organizationId)
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching contracts by status:', error)
      throw new Error('Failed to fetch contracts by status')
    }
  }

  // Get contracts ending soon
  static async getContractsEndingSoon(days: number = 30, organizationId: string): Promise<Contract[]> {
    try {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + days)

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          clients!inner(name, company)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .not('end_date', 'is', null)
        .lte('end_date', endDate.toISOString().split('T')[0])
        .order('end_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching contracts ending soon:', error)
      throw new Error('Failed to fetch contracts ending soon')
    }
  }
}
