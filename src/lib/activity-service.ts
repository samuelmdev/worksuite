import { supabase } from './supabase'

export interface ActivityLog {
  id: string
  user_id: string
  module: 'crm' | 'time_tracking' | 'projects' | 'settings'
  entity_type: string
  entity_id: string
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'submitted' | 'call_made' | 'call_received' | 'email_sent' | 'email_received' | 'meeting_scheduled' | 'meeting_completed' | 'meeting_cancelled' | 'proposal_sent' | 'contract_signed' | 'follow_up_scheduled'
  title: string
  description: string | null
  old_values: any
  new_values: any
  created_at: string
  user?: {
    first_name: string
    last_name: string
  } | null
}

export interface ClientInteractionLog {
  id: string
  user_id: string
  action: string
  title: string
  description: string | null
  created_at: string
  user_name: string
  metadata: any
}

export interface ClientActivityTimeline {
  id: string
  user_id: string
  module: string
  entity_type: string
  action: string
  title: string
  description: string | null
  created_at: string
  user_name: string
  metadata: any
}

export interface ManualInteractionData {
  client_id: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'task'
  subject: string
  description?: string
  scheduled_at?: string
  completed_at?: string
  status?: 'pending' | 'completed' | 'cancelled'
}

export interface ClientActivity {
  id: string
  client_id: string
  user_id: string
  type: string
  subject: string
  description: string | null
  scheduled_at: string | null
  completed_at: string | null
  status: string
  created_at: string
  user?: {
    first_name: string
    last_name: string
  } | null
}

export interface ActivityStats {
  total_clients?: number
  total_time_entries?: number
  total_projects?: number
  total_hours?: number
  pending_approvals?: number
  active_projects?: number
  completed_projects?: number
  total_budget?: number
  team_members?: number
}

export class ActivityService {
  private supabase = supabase

  async getRecentActivities(module: string, limit: number = 10): Promise<ActivityLog[]> {
    const { data, error } = await this.supabase
      .from('activity_logs')
      .select(`
        *,
        user:users(first_name, last_name)
      `)
      .eq('module', module)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching activities:', error)
      return []
    }

    return data || []
  }

  async getActivityStats(module: string): Promise<ActivityStats> {
    const stats: ActivityStats = {}

    try {
      switch (module) {
        case 'crm':
          // Get client stats
          const { data: clients } = await this.supabase
            .from('clients')
            .select('id')
          
          stats.total_clients = clients?.length || 0
          break

        case 'time_tracking':
          // Get time tracking stats
          const { data: timeEntries } = await this.supabase
            .from('time_entries')
            .select('billable_hours, status')
          
          stats.total_time_entries = timeEntries?.length || 0
          stats.total_hours = timeEntries?.reduce((sum, entry) => sum + (entry.billable_hours || 0), 0) || 0
          stats.pending_approvals = timeEntries?.filter(entry => entry.status === 'submitted').length || 0
          break

        case 'projects':
          // Get project stats
          const { data: projects } = await this.supabase
            .from('projects')
            .select('id, status, budget')
          
          stats.total_projects = projects?.length || 0
          stats.active_projects = projects?.filter(p => p.status === 'active').length || 0
          stats.completed_projects = projects?.filter(p => p.status === 'completed').length || 0
          stats.total_budget = projects?.reduce((sum, project) => sum + (project.budget || 0), 0) || 0

          // Get team members count
          const { data: teamMembers } = await this.supabase
            .from('project_employees')
            .select('user_id')
          
          stats.team_members = new Set(teamMembers?.map(m => m.user_id) || []).size
          break
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }

    return stats
  }

  async getAllRecentActivities(limit: number = 20): Promise<ActivityLog[]> {
    const { data, error } = await this.supabase
      .from('activity_logs')
      .select(`
        *,
        user:users(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching all activities:', error)
      return []
    }

    return data || []
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? 's' : ''} ago`
    }
  }

  getUserDisplayName(user: { first_name?: string; last_name?: string } | null | undefined): string {
    if (!user) return 'Unknown User'
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.first_name || user.last_name || 'Unknown User'
  }

  // Client interaction specific methods
  async getClientActivities(clientId: string, limit: number = 50): Promise<ClientActivity[]> {
    const { data, error } = await this.supabase
      .from('client_activities')
      .select(`
        *,
        user:users(first_name, last_name)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching client activities:', error)
      return []
    }

    return data || []
  }

  async getAllClientActivities(clientId: string, limit: number = 50): Promise<ClientActivityTimeline[]> {
    return this.getClientUnifiedTimeline(clientId, limit)
  }

  async getClientUnifiedTimeline(clientId: string, limit: number = 100): Promise<ClientActivityTimeline[]> {
    const items: ClientActivityTimeline[] = []

    const activities = await this.getClientActivities(clientId, limit)
    for (const activity of activities) {
      items.push({
        id: `ca-${activity.id}`,
        user_id: activity.user_id,
        module: 'crm',
        entity_type: 'client_activity',
        action: activity.type,
        title: activity.subject,
        description: activity.description,
        created_at: activity.created_at,
        user_name: activity.user
          ? `${activity.user.first_name} ${activity.user.last_name}`.trim()
          : 'Unknown User',
        metadata: {
          status: activity.status,
          scheduled_at: activity.scheduled_at,
          completed_at: activity.completed_at,
        },
      })
    }

    const { data: contracts } = await this.supabase
      .from('contracts')
      .select('id')
      .eq('client_id', clientId)

    const { data: tasks } = await this.supabase
      .from('tasks')
      .select('id')
      .eq('client_id', clientId)

    const relatedEntityIds = [
      clientId,
      ...(contracts?.map(c => c.id) || []),
      ...(tasks?.map(t => t.id) || []),
    ]

    const { data: activityLogs, error: logsError } = await this.supabase
      .from('activity_logs')
      .select(`
        *,
        user:users(first_name, last_name)
      `)
      .eq('module', 'crm')
      .in('entity_id', relatedEntityIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (logsError) {
      console.error('Error fetching client activity logs:', logsError)
    } else {
      for (const log of activityLogs || []) {
        items.push({
          id: `al-${log.id}`,
          user_id: log.user_id,
          module: log.module,
          entity_type: log.entity_type,
          action: log.action,
          title: log.title,
          description: log.description,
          created_at: log.created_at,
          user_name: log.user
            ? `${log.user.first_name} ${log.user.last_name}`.trim()
            : 'Unknown User',
          metadata: log.new_values,
        })
      }
    }

    const seen = new Set<string>()
    return items
      .filter(item => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }

  async getAllClientActivitiesOrg(limit: number = 1000): Promise<ClientActivity[]> {
    const { data, error } = await this.supabase
      .from('client_activities')
      .select(`
        *,
        user:users(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching all client activities:', error)
      return []
    }

    return data || []
  }

  async getClientActivityTimeline(clientId: string, limit: number = 50): Promise<ClientInteractionLog[]> {
    // Map client_activities to the timeline format for backward compatibility
    const activities = await this.getClientActivities(clientId, limit)
    return activities.map(activity => ({
      id: activity.id,
      user_id: activity.user_id,
      action: activity.type,
      title: activity.subject,
      description: activity.description,
      created_at: activity.created_at,
      user_name: activity.user ? `${activity.user.first_name} ${activity.user.last_name}` : 'Unknown User',
      metadata: {
        status: activity.status,
        scheduled_at: activity.scheduled_at,
        completed_at: activity.completed_at
      }
    }))
  }


  async createManualInteraction(interactionData: ManualInteractionData): Promise<string | null> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser()
      if (userError || !user) {
        console.error('Error getting user:', userError)
        return null
      }

      console.log('Creating manual interaction for user:', user.id)
      console.log('Interaction data:', interactionData)

      // Insert into client_activities table
      const { data: insertData, error: insertError } = await this.supabase
        .from('client_activities')
        .insert({
          client_id: interactionData.client_id,
          user_id: user.id,
          type: interactionData.type,
          subject: interactionData.subject,
          description: interactionData.description || null,
          scheduled_at: interactionData.scheduled_at || null,
          completed_at: interactionData.completed_at || null,
          status: interactionData.status || 'completed'
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        return null
      }

      console.log('Successfully created client activity:', insertData)
      return insertData.id
    } catch (err) {
      console.error('Error creating manual interaction:', err)
      return null
    }
  }

  async getClientInteractionStats(clientId: string): Promise<{
    total_interactions: number
    calls_made: number
    emails_sent: number
    meetings_scheduled: number
    last_interaction: string | null
  }> {
    const { data, error } = await this.supabase
      .from('client_activities')
      .select('type, created_at')
      .eq('client_id', clientId)

    if (error) {
      console.error('Error fetching client interaction stats:', error)
      return {
        total_interactions: 0,
        calls_made: 0,
        emails_sent: 0,
        meetings_scheduled: 0,
        last_interaction: null
      }
    }

    const interactions = data || []
    const calls_made = interactions.filter(i => i.type === 'call').length
    const emails_sent = interactions.filter(i => i.type === 'email').length
    const meetings_scheduled = interactions.filter(i => i.type === 'meeting').length
    const last_interaction = interactions.length > 0 ? interactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at : null

    return {
      total_interactions: interactions.length,
      calls_made,
      emails_sent,
      meetings_scheduled,
      last_interaction
    }
  }

  getInteractionIcon(action: string): string {
    switch (action) {
      case 'call_made':
      case 'call_received':
        return '📞'
      case 'email_sent':
      case 'email_received':
        return '📧'
      case 'meeting_scheduled':
      case 'meeting_completed':
      case 'meeting_cancelled':
        return '🤝'
      case 'proposal_sent':
        return '📋'
      case 'contract_signed':
        return '📝'
      case 'follow_up_scheduled':
        return '⏰'
      case 'created':
        return '➕'
      case 'updated':
        return '✏️'
      case 'deleted':
        return '🗑️'
      default:
        return '📋'
    }
  }

  getInteractionColor(action: string): string {
    switch (action) {
      case 'call':
      case 'call_made':
      case 'call_received':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30'
      case 'email':
      case 'email_sent':
      case 'email_received':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
      case 'meeting':
      case 'meeting_scheduled':
      case 'meeting_completed':
        return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30'
      case 'meeting_cancelled':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30'
      case 'note':
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800'
      case 'task':
      case 'proposal_sent':
        return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30'
      case 'contract_signed':
        return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30'
      case 'follow_up':
      case 'follow_up_scheduled':
        return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30'
      case 'created':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30'
      case 'updated':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
      case 'deleted':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30'
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800'
    }
  }
}

export const activityService = new ActivityService()
