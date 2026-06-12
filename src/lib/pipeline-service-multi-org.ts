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
      const mappedData = (data || []).map(item => ({
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
        updatedAt: item.updated_at
      }))
      
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

      const insertData = {
        organization_id: itemData.organization_id,
        title: itemData.title,
        type: itemData.type,
        client_id: itemData.clientId,
        client_name: itemData.clientName,
        client_email: itemData.clientEmail,
        client_company: itemData.clientCompany,
        client_phone: itemData.clientPhone,
        value: itemData.value,
        stage: itemData.stage,
        probability: itemData.probability,
        expected_close_date: itemData.expectedCloseDate,
        assigned_to: itemData.assignedTo,
        notes: itemData.notes,
        source: itemData.source,
        is_archived: itemData.isArchived || false,
        archived_at: itemData.archivedAt
      }

      const { data, error } = await supabase
        .from('pipeline_items')
        .insert([insertData])
        .select()
        .single()

      if (error) {
        console.error('PipelineService.createPipelineItem error:', error)
        throw error
      }

      // Map the response to match our interface
      const mappedData = {
        id: data.id,
        title: data.title,
        type: data.type,
        clientId: data.client_id,
        clientName: data.client_name,
        clientEmail: data.client_email,
        clientCompany: data.client_company,
        clientPhone: data.client_phone,
        value: data.value,
        stage: data.stage,
        probability: data.probability,
        expectedCloseDate: data.expected_close_date,
        assignedTo: data.assigned_to,
        notes: data.notes,
        source: data.source,
        isArchived: data.is_archived,
        isBlocked: data.is_blocked,
        blockReason: data.block_reason,
        archivedAt: data.archived_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      return mappedData
    } catch (error) {
      console.error('PipelineService.createPipelineItem error:', error)
      throw error
    }
  }

  // Update a pipeline item
  static async updatePipelineItem(id: string, updates: Partial<PipelineItemFormData>, organizationId: string): Promise<PipelineItem> {
    try {
      // Remove organization_id from updates if present (cannot be changed)
      const { organization_id, ...safeUpdates } = updates as any

      const { data, error } = await supabase
        .from('pipeline_items')
        .update(safeUpdates)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('PipelineService.updatePipelineItem error:', error)
        throw error
      }

      // Map the response to match our interface
      const mappedData = {
        id: data.id,
        title: data.title,
        type: data.type,
        clientId: data.client_id,
        clientName: data.client_name,
        clientEmail: data.client_email,
        clientCompany: data.client_company,
        clientPhone: data.client_phone,
        value: data.value,
        stage: data.stage,
        probability: data.probability,
        expectedCloseDate: data.expected_close_date,
        assignedTo: data.assigned_to,
        notes: data.notes,
        source: data.source,
        isArchived: data.is_archived,
        isBlocked: data.is_blocked,
        blockReason: data.block_reason,
        archivedAt: data.archived_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      return mappedData
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
