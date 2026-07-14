import { supabase } from './supabase'
import { Database } from './supabase'

export interface PipelineItem {
  id: string
  title: string
  type: 'lead' | 'deal'
  clientId?: string
  clientName: string
  clientEmail: string
  clientCompany: string
  clientPhone?: string
  value: number
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
  probability: number
  expectedCloseDate: string
  assignedTo: string
  notes: string
  source?: string
  isArchived?: boolean
  isBlocked?: boolean
  blockReason?: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PipelineItemFormData {
  title: string
  type: 'lead' | 'deal'
  clientId?: string
  clientName: string
  clientEmail: string
  clientCompany: string
  clientPhone?: string
  value: number
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
  probability: number
  expectedCloseDate: string
  assignedTo: string
  notes: string
  source?: string
  isArchived?: boolean
  archivedAt?: string
  organization_id: string // Required - must always be set
}

type PipelineItemUpdates = Partial<PipelineItemFormData> & {
  clientId?: string
  isBlocked?: boolean
  blockReason?: string
  isArchived?: boolean
  archivedAt?: string
  expectedCloseDate?: string
  assignedTo?: string
}

function mapPipelineItemToRow(
  updates: PipelineItemUpdates,
  organizationId?: string,
  createdBy?: string | null
) {
  const row: Record<string, unknown> = {}

  if (organizationId) row.organization_id = organizationId
  if (createdBy !== undefined) row.created_by = createdBy
  if (updates.title !== undefined) row.title = updates.title
  if (updates.type !== undefined) row.type = updates.type
  if (updates.clientId !== undefined) row.client_id = updates.clientId || null
  if (updates.clientName !== undefined) row.client_name = updates.clientName
  if (updates.clientEmail !== undefined) row.client_email = updates.clientEmail
  if (updates.clientCompany !== undefined) row.client_company = updates.clientCompany
  if (updates.clientPhone !== undefined) row.client_phone = updates.clientPhone
  if (updates.value !== undefined) row.value = updates.value
  if (updates.stage !== undefined) row.stage = updates.stage
  if (updates.probability !== undefined) row.probability = updates.probability
  if (updates.expectedCloseDate !== undefined) {
    row.expected_close_date = updates.expectedCloseDate || null
  }
  if (updates.assignedTo !== undefined) row.assigned_to = updates.assignedTo
  if (updates.notes !== undefined) row.notes = updates.notes
  if (updates.source !== undefined) row.source = updates.source
  if (updates.isArchived !== undefined) row.is_archived = updates.isArchived
  if (updates.archivedAt !== undefined) row.archived_at = updates.archivedAt
  if (updates.isBlocked !== undefined) row.is_blocked = updates.isBlocked
  if (updates.blockReason !== undefined) row.block_reason = updates.blockReason

  return row
}

function mapPipelineItemFromRow(item: any): PipelineItem {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    clientId: item.client_id,
    clientName: item.client_name,
    clientEmail: item.client_email,
    clientCompany: item.client_company,
    clientPhone: item.client_phone,
    value: item.value,
    stage: item.stage,
    probability: item.probability,
    expectedCloseDate: item.expected_close_date,
    assignedTo: item.assigned_to,
    notes: item.notes,
    source: item.source,
    isArchived: item.is_archived,
    isBlocked: item.is_blocked,
    blockReason: item.block_reason,
    archivedAt: item.archived_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export class PipelineService {
  // Get all pipeline items for the organization
  static async getPipelineItems(organizationId: string): Promise<PipelineItem[]> {
    try {
      const { data, error } = await supabase
        .from('pipeline_items')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('PipelineService.getPipelineItems error:', error)
        throw error
      }
      
      // Map database fields to interface fields
      const mappedData = (data || []).map(mapPipelineItemFromRow)
      
      return mappedData
    } catch (error) {
      console.error('PipelineService.getPipelineItems error:', error)
      throw error
    }
  }

  // Create a new pipeline item
  static async createPipelineItem(itemData: PipelineItemFormData): Promise<PipelineItem> {
    try {
      if (!itemData.organization_id) {
        throw new Error('Organization ID is required for pipeline items')
      }

      const { data: { user } } = await supabase.auth.getUser()
      const insertData = mapPipelineItemToRow(itemData, itemData.organization_id, user?.id ?? null)

      const { data, error } = await supabase
        .from('pipeline_items')
        .insert([insertData])
        .select()
        .single()

      if (error) {
        console.error('PipelineService.createPipelineItem error:', error)
        throw error
      }

      return mapPipelineItemFromRow(data)
    } catch (error) {
      console.error('PipelineService.createPipelineItem error:', error)
      throw error
    }
  }

  // Update a pipeline item
  static async updatePipelineItem(id: string, updates: PipelineItemUpdates, organizationId: string): Promise<PipelineItem> {
    try {
      const updateData = mapPipelineItemToRow(updates)

      const { data, error } = await supabase
        .from('pipeline_items')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('PipelineService.updatePipelineItem error:', error)
        throw error
      }

      return mapPipelineItemFromRow(data)
    } catch (error) {
      console.error('PipelineService.updatePipelineItem error:', error)
      throw error
    }
  }

  // Delete a pipeline item
  static async deletePipelineItem(id: string, organizationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pipeline_items')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('PipelineService.deletePipelineItem error:', error)
        throw error
      }
    } catch (error) {
      console.error('PipelineService.deletePipelineItem error:', error)
      throw error
    }
  }

  // Archive a pipeline item
  static async archivePipelineItem(id: string, organizationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pipeline_items')
        .update({ 
          is_archived: true,
          archived_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('PipelineService.archivePipelineItem error:', error)
        throw error
      }
    } catch (error) {
      console.error('PipelineService.archivePipelineItem error:', error)
      throw error
    }
  }

  // Unarchive a pipeline item
  static async unarchivePipelineItem(id: string, organizationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pipeline_items')
        .update({ 
          is_archived: false,
          archived_at: null
        })
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('PipelineService.unarchivePipelineItem error:', error)
        throw error
      }
    } catch (error) {
      console.error('PipelineService.unarchivePipelineItem error:', error)
      throw error
    }
  }

  // Block a pipeline item
  static async blockPipelineItem(id: string, reason: string, organizationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pipeline_items')
        .update({ 
          is_blocked: true,
          block_reason: reason
        })
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('PipelineService.blockPipelineItem error:', error)
        throw error
      }
    } catch (error) {
      console.error('PipelineService.blockPipelineItem error:', error)
      throw error
    }
  }

  // Unblock a pipeline item
  static async unblockPipelineItem(id: string, organizationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pipeline_items')
        .update({ 
          is_blocked: false,
          block_reason: null
        })
        .eq('id', id)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('PipelineService.unblockPipelineItem error:', error)
        throw error
      }
    } catch (error) {
      console.error('PipelineService.unblockPipelineItem error:', error)
      throw error
    }
  }
}
