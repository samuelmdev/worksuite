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
}

export class PipelineService {
  // Get all pipeline items for the current user's organization
  static async getPipelineItems(): Promise<PipelineItem[]> {
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
        .from('pipeline_items')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching pipeline items:', error)
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

      const insertData = {
        organization_id: userData.organization_id,
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
        created_by: user.id
      }

      const { data, error } = await supabase
        .from('pipeline_items')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error creating pipeline item:', error)
        throw error
      }
      
      // Map database fields to interface fields
      return {
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
    } catch (error) {
      console.error('PipelineService.createPipelineItem error:', error)
      throw error
    }
  }

  // Update an existing pipeline item
  static async updatePipelineItem(id: string, itemData: Partial<PipelineItemFormData>): Promise<PipelineItem> {
    try {
      // Map interface fields to database fields
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (itemData.title !== undefined) updateData.title = itemData.title
      if (itemData.type !== undefined) updateData.type = itemData.type
      if (itemData.clientId !== undefined) updateData.client_id = itemData.clientId
      if (itemData.clientName !== undefined) updateData.client_name = itemData.clientName
      if (itemData.clientEmail !== undefined) updateData.client_email = itemData.clientEmail
      if (itemData.clientCompany !== undefined) updateData.client_company = itemData.clientCompany
      if (itemData.clientPhone !== undefined) updateData.client_phone = itemData.clientPhone
      if (itemData.value !== undefined) updateData.value = itemData.value
      if (itemData.stage !== undefined) updateData.stage = itemData.stage
      if (itemData.probability !== undefined) updateData.probability = itemData.probability
      if (itemData.expectedCloseDate !== undefined) updateData.expected_close_date = itemData.expectedCloseDate
      if (itemData.assignedTo !== undefined) updateData.assigned_to = itemData.assignedTo
      if (itemData.notes !== undefined) updateData.notes = itemData.notes
      if (itemData.source !== undefined) updateData.source = itemData.source

      const { data, error } = await supabase
        .from('pipeline_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating pipeline item:', error)
        throw error
      }
      
      // Map database fields to interface fields
      return {
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
    } catch (error) {
      console.error('PipelineService.updatePipelineItem error:', error)
      throw error
    }
  }

  // Delete a pipeline item
  static async deletePipelineItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pipeline_items')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting pipeline item:', error)
        throw error
      }
    } catch (error) {
      console.error('PipelineService.deletePipelineItem error:', error)
      throw error
    }
  }

  // Archive a pipeline item
  static async archivePipelineItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pipeline_items')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error archiving pipeline item:', error)
        throw error
      }
    } catch (error) {
      console.error('PipelineService.archivePipelineItem error:', error)
      throw error
    }
  }

  // Unarchive a pipeline item
  static async unarchivePipelineItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pipeline_items')
        .update({
          is_archived: false,
          archived_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error unarchiving pipeline item:', error)
        throw error
      }
    } catch (error) {
      console.error('PipelineService.unarchivePipelineItem error:', error)
      throw error
    }
  }

  // Block a pipeline item
  static async blockPipelineItem(id: string, reason: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pipeline_items')
        .update({
          is_blocked: true,
          block_reason: reason,
          blocked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error blocking pipeline item:', error)
        throw error
      }
    } catch (error) {
      console.error('PipelineService.blockPipelineItem error:', error)
      throw error
    }
  }

  // Unblock a pipeline item
  static async unblockPipelineItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pipeline_items')
        .update({
          is_blocked: false,
          block_reason: null,
          blocked_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error unblocking pipeline item:', error)
        throw error
      }
    } catch (error) {
      console.error('PipelineService.unblockPipelineItem error:', error)
      throw error
    }
  }
}
