import { supabase } from './supabase'
import { Database } from './supabase'

type PipelineItem = Database['public']['Tables']['pipeline_items']['Row']
type PipelineItemInsert = Database['public']['Tables']['pipeline_items']['Insert']
type PipelineItemUpdate = Database['public']['Tables']['pipeline_items']['Update']

export interface PipelineStats {
  total_items: number
  total_value: number
  weighted_value: number
  won_items: number
  won_value: number
  items_by_stage: Record<string, number>
  value_by_stage: Record<string, number>
  leads_count: number
  deals_count: number
}

export class PipelineService {
  static async getPipelineItems(): Promise<PipelineItem[]> {
    const { data, error } = await supabase
      .from('pipeline_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pipeline items:', error)
      throw new Error('Failed to fetch pipeline items')
    }

    return data || []
  }

  static async getPipelineItem(id: string): Promise<PipelineItem | null> {
    const { data, error } = await supabase
      .from('pipeline_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching pipeline item:', error)
      return null
    }

    return data
  }

  static async createPipelineItem(item: PipelineItemInsert): Promise<PipelineItem> {
    const { data, error } = await supabase
      .from('pipeline_items')
      .insert(item)
      .select()
      .single()

    if (error) {
      console.error('Error creating pipeline item:', error)
      throw new Error('Failed to create pipeline item')
    }

    return data
  }

  static async updatePipelineItem(id: string, updates: PipelineItemUpdate): Promise<PipelineItem> {
    const { data, error } = await supabase
      .from('pipeline_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating pipeline item:', error)
      throw new Error('Failed to update pipeline item')
    }

    return data
  }

  static async deletePipelineItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('pipeline_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting pipeline item:', error)
      throw new Error('Failed to delete pipeline item')
    }
  }

  static async updatePipelineItemStage(id: string, stage: string): Promise<PipelineItem> {
    return this.updatePipelineItem(id, { 
      stage: stage as any,
      updated_at: new Date().toISOString()
    })
  }

  static async getPipelineStats(): Promise<PipelineStats> {
    const { data, error } = await supabase
      .from('pipeline_items')
      .select('type, stage, value, probability')

    if (error) {
      console.error('Error fetching pipeline stats:', error)
      return {
        total_items: 0,
        total_value: 0,
        weighted_value: 0,
        won_items: 0,
        won_value: 0,
        items_by_stage: {},
        value_by_stage: {},
        leads_count: 0,
        deals_count: 0
      }
    }

    const items = data || []
    const total_items = items.length
    const total_value = items.reduce((sum, item) => sum + (item.value || 0), 0)
    const weighted_value = items.reduce((sum, item) => sum + ((item.value || 0) * (item.probability || 0) / 100), 0)
    
    const wonItems = items.filter(item => item.stage === 'closed-won')
    const won_items = wonItems.length
    const won_value = wonItems.reduce((sum, item) => sum + (item.value || 0), 0)

    const leads_count = items.filter(item => item.type === 'lead').length
    const deals_count = items.filter(item => item.type === 'deal').length

    const items_by_stage = items.reduce((acc, item) => {
      acc[item.stage] = (acc[item.stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const value_by_stage = items.reduce((acc, item) => {
      acc[item.stage] = (acc[item.stage] || 0) + (item.value || 0)
      return acc
    }, {} as Record<string, number>)

    return {
      total_items,
      total_value,
      weighted_value,
      won_items,
      won_value,
      items_by_stage,
      value_by_stage,
      leads_count,
      deals_count
    }
  }

  static async convertLeadToClient(itemId: string): Promise<{ clientId: string; item: PipelineItem }> {
    // First get the pipeline item
    const item = await this.getPipelineItem(itemId)
    if (!item) {
      throw new Error('Pipeline item not found')
    }

    if (item.type !== 'lead') {
      throw new Error('Only leads can be converted to clients')
    }

    // Create client from lead data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: item.client_name,
        email: item.client_email,
        company: item.client_company,
        phone: item.client_phone,
        organization_id: item.organization_id
      })
      .select()
      .single()

    if (clientError) {
      console.error('Error creating client from lead:', clientError)
      throw new Error('Failed to create client from lead')
    }

    // Update pipeline item to mark as converted
    await this.updatePipelineItem(itemId, {
      stage: 'closed-won',
      notes: (item.notes || '') + '\n\n[Converted to client]'
    })

    return { clientId: client.id, item }
  }

  static async checkClientBlockStatus(clientEmail: string, clientName: string): Promise<{ isBlocked: boolean; reason?: string }> {
    const { data, error } = await supabase
      .from('clients')
      .select('is_blocked, block_reason')
      .or(`email.eq.${clientEmail},name.eq.${clientName}`)
      .eq('is_blocked', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking client block status:', error)
      return { isBlocked: false }
    }

    return { 
      isBlocked: !!data?.is_blocked, 
      reason: data?.block_reason 
    }
  }

  static async blockClient(clientId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({
        is_blocked: true,
        block_reason: reason,
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)

    if (error) {
      console.error('Error blocking client:', error)
      throw new Error('Failed to block client')
    }
  }

  static async unblockClient(clientId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({
        is_blocked: false,
        block_reason: null,
        blocked_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)

    if (error) {
      console.error('Error unblocking client:', error)
      throw new Error('Failed to unblock client')
    }
  }

  static async createDealFromClient(clientId: string, dealData: Omit<PipelineItemInsert, 'client_id' | 'client_name' | 'client_email' | 'client_company' | 'client_phone'>): Promise<PipelineItem> {
    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      throw new Error('Client not found')
    }

    // Check if client is blocked
    if (client.is_blocked) {
      throw new Error(`Cannot create deal for blocked client: ${client.block_reason || 'Client is blocked'}`)
    }

    // Create deal with client data
    const deal: PipelineItemInsert = {
      ...dealData,
      type: 'deal',
      client_id: clientId,
      client_name: client.name,
      client_email: client.email,
      client_company: client.company,
      client_phone: client.phone,
      organization_id: client.organization_id
    }

    return this.createPipelineItem(deal)
  }

  static async archivePipelineItem(id: string): Promise<PipelineItem> {
    return this.updatePipelineItem(id, {
      is_archived: true,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  static async unarchivePipelineItem(id: string): Promise<PipelineItem> {
    return this.updatePipelineItem(id, {
      is_archived: false,
      archived_at: null,
      updated_at: new Date().toISOString()
    })
  }

  static async blockPipelineItem(id: string, reason: string): Promise<PipelineItem> {
    return this.updatePipelineItem(id, {
      is_blocked: true,
      block_reason: reason,
      stage: 'closed-lost',
      probability: 0,
      updated_at: new Date().toISOString()
    })
  }

  static async unblockPipelineItem(id: string): Promise<PipelineItem> {
    return this.updatePipelineItem(id, {
      is_blocked: false,
      block_reason: null,
      updated_at: new Date().toISOString()
    })
  }

  static async getArchivedItems(): Promise<PipelineItem[]> {
    const { data, error } = await supabase
      .from('pipeline_items')
      .select('*')
      .eq('is_archived', true)
      .order('archived_at', { ascending: false })

    if (error) {
      console.error('Error fetching archived items:', error)
      throw new Error('Failed to fetch archived items')
    }

    return data || []
  }

  static async getBlockedItems(): Promise<PipelineItem[]> {
    const { data, error } = await supabase
      .from('pipeline_items')
      .select('*')
      .eq('is_blocked', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching blocked items:', error)
      throw new Error('Failed to fetch blocked items')
    }

    return data || []
  }
}
