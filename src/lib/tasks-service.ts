import { supabase } from './supabase'

export interface Task {
  id: string
  client_id?: string
  title: string
  description?: string
  task_type: 'call' | 'meeting' | 'email' | 'follow_up' | 'proposal' | 'contract_review' | 'other'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  is_scheduled: boolean
  assigned_to?: string
  created_by: string
  created_at: string
  updated_at: string
  completed_at?: string
  // Joined data
  client_name?: string
  assigned_user_name?: string
}

export interface TaskFormData {
  client_id?: string | null
  title: string
  description?: string
  task_type: 'call' | 'meeting' | 'email' | 'follow_up' | 'proposal' | 'contract_review' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string | undefined
  is_scheduled: boolean
  assigned_to?: string | null
}

export interface TaskStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
  changeFromLastMonth: number
}

export class TasksService {
  static async getTasks(filters?: {
    status?: string
    client_id?: string
    assigned_to?: string
    due_date_from?: string
    due_date_to?: string
  }): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        clients(name)
      `)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.client_id) {
      query = query.eq('client_id', filters.client_id)
    }

    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters?.due_date_from) {
      query = query.gte('due_date', filters.due_date_from)
    }

    if (filters?.due_date_to) {
      query = query.lte('due_date', filters.due_date_to)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      throw error
    }

    return data?.map(task => ({
      ...task,
      client_name: task.clients?.name,
      assigned_user_name: task.assigned_to ? 'User' : undefined // We'll handle user names differently
    })) || []
  }

  static async getTask(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        clients(name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching task:', error)
      throw error
    }

    if (!data) return null

    return {
      ...data,
      client_name: data.clients?.name,
      assigned_user_name: data.assigned_user ? 
        `${data.assigned_user.first_name} ${data.assigned_user.last_name}`.trim() : 
        undefined
    }
  }

  static async createTask(taskData: TaskFormData): Promise<Task> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        created_by: user.id
      })
      .select(`
        *,
        clients(name)
      `)
      .single()

    if (error) {
      console.error('Error creating task:', error)
      throw error
    }

    return {
      ...data,
      client_name: data.clients?.name,
      assigned_user_name: data.assigned_user ? 
        `${data.assigned_user.first_name} ${data.assigned_user.last_name}`.trim() : 
        undefined
    }
  }

  static async updateTask(id: string, taskData: Partial<TaskFormData>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', id)
      .select(`
        *,
        clients(name)
      `)
      .single()

    if (error) {
      console.error('Error updating task:', error)
      throw error
    }

    return {
      ...data,
      client_name: data.clients?.name,
      assigned_user_name: data.assigned_user ? 
        `${data.assigned_user.first_name} ${data.assigned_user.last_name}`.trim() : 
        undefined
    }
  }

  static async updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
    const updateData: any = { status }
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else {
      updateData.completed_at = null
    }

    return this.updateTask(id, updateData)
  }

  static async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  static async getTaskStats(): Promise<TaskStats> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get current month stats
    const { data: currentStats, error: currentError } = await supabase
      .from('tasks')
      .select('status, created_at')
      .gte('created_at', startOfMonth.toISOString())

    if (currentError) {
      console.error('Error fetching current task stats:', currentError)
      throw currentError
    }

    // Get last month stats
    const { data: lastMonthStats, error: lastMonthError } = await supabase
      .from('tasks')
      .select('status, created_at')
      .gte('created_at', startOfLastMonth.toISOString())
      .lte('created_at', endOfLastMonth.toISOString())

    if (lastMonthError) {
      console.error('Error fetching last month task stats:', lastMonthError)
      throw lastMonthError
    }

    // Calculate current stats
    const total = currentStats?.length || 0
    const pending = currentStats?.filter(t => t.status === 'pending').length || 0
    const in_progress = currentStats?.filter(t => t.status === 'in_progress').length || 0
    const completed = currentStats?.filter(t => t.status === 'completed').length || 0

    // Calculate overdue tasks (pending/in_progress with due_date < now)
    const { data: overdueTasks, error: overdueError } = await supabase
      .from('tasks')
      .select('id')
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', now.toISOString())
      .not('due_date', 'is', null)

    if (overdueError) {
      console.error('Error fetching overdue tasks:', overdueError)
    }

    const overdue = overdueTasks?.length || 0

    // Calculate month-over-month change
    const lastMonthTotal = lastMonthStats?.length || 0
    let changeFromLastMonth = 0

    if (lastMonthTotal > 0) {
      changeFromLastMonth = Math.round(((total - lastMonthTotal) / lastMonthTotal) * 100)
    } else if (total > 0) {
      changeFromLastMonth = 100
    }

    return {
      total,
      pending,
      in_progress,
      completed,
      overdue,
      changeFromLastMonth
    }
  }

  static async getUpcomingTasks(limit: number = 10): Promise<Task[]> {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        clients(name)
      `)
      .in('status', ['pending', 'in_progress'])
      .gte('due_date', now.toISOString())
      .lte('due_date', nextWeek.toISOString())
      .order('due_date', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching upcoming tasks:', error)
      throw error
    }

    return data?.map(task => ({
      ...task,
      client_name: task.clients?.name,
      assigned_user_name: task.assigned_to ? 'User' : undefined // We'll handle user names differently
    })) || []
  }
}
