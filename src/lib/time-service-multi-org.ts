import { supabase } from './supabase'
import { Database } from './supabase'

// Define TimeEntry type to match the existing database schema
export interface TimeEntry {
  id: string
  organization_id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  project_name: string | null
  description: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  billable_hours: number | null
  hourly_rate: number | null
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  approved_by: string | null
  approved_at: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

export type TimeEntryFormData = {
  user_id: string
  organization_id: string // Required - must always be set
  client_id: string | null
  project_id: string | null
  // Retained as a denormalised label so historical entries keep their project
  // name if the project is later renamed or deleted.
  project_name: string
  description: string
  start_time: string
  end_time: string
  billable_hours: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  tags?: string[]
}

export interface TimeEntryStats {
  total_hours_this_week?: number
  total_hours_this_month?: number
  total_entries_this_week?: number
  total_entries_this_month?: number
  pending_approvals?: number
  approved_entries?: number
  rejected_entries?: number
  billable_hours?: number
  non_billable_hours?: number
}

export interface TimeEntryFilters {
  user_id?: string
  status?: 'draft' | 'submitted' | 'approved' | 'rejected'
  client_id?: string
  start_date?: string
  end_date?: string
  billable?: boolean
}

export interface WeeklyTimeSlot {
  date: string
  timeEntries: TimeEntry[]
  totalHours: number
}

export class TimeService {
  // Get all time entries with optional filters - ALWAYS filtered by organization
  static async getTimeEntries(filters: TimeEntryFilters = {}, organizationId: string): Promise<TimeEntry[]> {
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        clients:client_id(name),
        users:user_id(first_name, last_name)
      `)
      .eq('organization_id', organizationId) // Always filter by organization
      .order('created_at', { ascending: false })

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id)
    }

    if (filters.start_date) {
      query = query.gte('start_time', filters.start_date)
    }

    if (filters.end_date) {
      query = query.lte('start_time', filters.end_date + 'T23:59:59')
    }

    if (filters.billable !== undefined) {
      if (filters.billable) {
        query = query.gt('billable_hours', 0)
      } else {
        query = query.or('billable_hours.is.null,billable_hours.eq.0')
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching time entries:', error)
      throw new Error('Failed to fetch time entries')
    }

    return data || []
  }

  // Get time entries for a specific week - ALWAYS filtered by organization
  static async getWeeklyTimeEntries(weekStart: string, filters: TimeEntryFilters = {}, organizationId: string): Promise<WeeklyTimeSlot[]> {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const entries = await this.getTimeEntries({
      ...filters,
      start_date: weekStart,
      end_date: weekEnd.toISOString().split('T')[0]
    }, organizationId)

    // Group entries by date (extract date from start_time)
    const groupedEntries = entries.reduce((acc: Record<string, TimeEntry[]>, entry: TimeEntry) => {
      const date = new Date(entry.start_time).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(entry)
      return acc
    }, {} as Record<string, TimeEntry[]>)

    // Create weekly slots
    const weeklySlots: WeeklyTimeSlot[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      weeklySlots.push({
        date: dateStr,
        timeEntries: groupedEntries[dateStr] || [],
        totalHours: (groupedEntries[dateStr] || []).reduce((sum, entry) => sum + (entry.billable_hours || 0), 0)
      })
    }

    return weeklySlots
  }

  // Create a new time entry - ALWAYS requires organization_id
  static async createTimeEntry(entryData: TimeEntryFormData): Promise<TimeEntry> {
    // Validate that organization_id is provided
    if (!entryData.organization_id) {
      throw new Error('Organization ID is required for time entries')
    }

    // Calculate duration in minutes
    const startTime = new Date(entryData.start_time)
    const endTime = new Date(entryData.end_time)
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    
    const insertData = {
      ...entryData,
      duration_minutes: durationMinutes,
      tags: entryData.tags || null
    }
    
    const { data, error } = await supabase
      .from('time_entries')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Error creating time entry:', error)
      throw new Error('Failed to create time entry')
    }

    return data
  }

  // Update a time entry - organization_id cannot be changed
  static async updateTimeEntry(id: string, updates: Partial<TimeEntryFormData>, organizationId: string): Promise<TimeEntry> {
    // Remove organization_id from updates if present (cannot be changed)
    const { organization_id, ...safeUpdates } = updates as any

    const { data, error } = await supabase
      .from('time_entries')
      .update(safeUpdates)
      .eq('id', id)
      .eq('organization_id', organizationId) // Ensure user can only update their org's entries
      .select()
      .single()

    if (error) {
      console.error('Error updating time entry:', error)
      throw new Error('Failed to update time entry')
    }

    return data
  }

  // Delete a time entry - ALWAYS filtered by organization
  static async deleteTimeEntry(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId) // Ensure user can only delete their org's entries

    if (error) {
      console.error('Error deleting time entry:', error)
      throw new Error('Failed to delete time entry')
    }
  }

  // Approve a time entry - ALWAYS filtered by organization
  static async approveTimeEntry(id: string, organizationId: string): Promise<TimeEntry> {
    return this.updateTimeEntry(id, { status: 'approved' }, organizationId)
  }

  // Reject a time entry - ALWAYS filtered by organization
  static async rejectTimeEntry(id: string, organizationId: string, reason?: string): Promise<TimeEntry> {
    const { data, error } = await supabase
      .from('time_entries')
      .update({ status: 'rejected' })
      .eq('id', id)
      .eq('organization_id', organizationId) // Ensure user can only reject their org's entries
      .select()
      .single()

    if (error) {
      console.error('Error rejecting time entry:', error)
      throw new Error('Failed to reject time entry')
    }

    return data
  }

  // Get time entry statistics - ALWAYS filtered by organization
  static async getTimeEntryStats(userId?: string, startDate?: string, endDate?: string, organizationId?: string): Promise<TimeEntryStats> {
    if (!organizationId) {
      throw new Error('Organization ID is required for time entry stats')
    }

    let query = supabase.from('time_entries').select('*').eq('organization_id', organizationId)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (startDate) {
      query = query.gte('start_time', startDate)
    }

    if (endDate) {
      query = query.lte('start_time', endDate + 'T23:59:59')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching time entry stats:', error)
      throw new Error('Failed to fetch time entry statistics')
    }

    const entries = data || []

    // Calculate stats
    const totalHours = entries.reduce((sum, entry) => sum + (entry.billable_hours || 0), 0)
    const billableHours = entries
      .filter(entry => (entry.billable_hours || 0) > 0)
      .reduce((sum, entry) => sum + (entry.billable_hours || 0), 0)
    const nonBillableHours = totalHours - billableHours

    const pendingApprovals = entries.filter(entry => entry.status === 'submitted').length
    const approvedEntries = entries.filter(entry => entry.status === 'approved').length
    const rejectedEntries = entries.filter(entry => entry.status === 'rejected').length

    return {
      total_hours_this_week: totalHours,
      total_hours_this_month: totalHours,
      total_entries_this_week: entries.length,
      total_entries_this_month: entries.length,
      pending_approvals: pendingApprovals,
      approved_entries: approvedEntries,
      rejected_entries: rejectedEntries,
      billable_hours: billableHours,
      non_billable_hours: nonBillableHours
    }
  }

  // Get current week start date (Monday)
  static getCurrentWeekStart(): string {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust for Sunday
    const monday = new Date(now.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  // Get week start for any given date
  static getWeekStart(dateStr: string): string {
    const date = new Date(dateStr)
    const dayOfWeek = date.getDay()
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(date)
    monday.setDate(diff)
    return monday.toISOString().split('T')[0]
  }

  // Get week end for any given week start
  static getWeekEnd(weekStart: string): string {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return end.toISOString().split('T')[0]
  }

  // Get month start for any given date
  static getMonthStart(dateStr: string): string {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
  }

  // Get month end for any given month start
  static getMonthEnd(monthStart: string): string {
    const date = new Date(monthStart)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
  }

  // Get date range for a week
  static getWeekDateRange(weekStart: string): { start: string; end: string } {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  // Format time entry for display
  static formatTimeEntry(entry: TimeEntry): string {
    const hours = entry.billable_hours || 0
    const minutes = Math.round((hours % 1) * 60)
    return `${Math.floor(hours)}h ${minutes}m`
  }

  // Format date for display
  static formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Get time entry status color
  static getStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'submitted':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      case 'rejected':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'draft':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  // Get time entry status icon
  static getStatusIcon(status: string): string {
    switch (status) {
      case 'approved':
        return '✅'
      case 'submitted':
        return '⏳'
      case 'rejected':
        return '❌'
      case 'draft':
        return '📝'
      default:
        return '📝'
    }
  }

  // =============================================
  // REPORTS METHODS - ALWAYS FILTERED BY ORGANIZATION
  // =============================================

  // Get employee salary data (hourly rate × hours) - ALWAYS filtered by organization
  static async getEmployeeSalaryData(
    startDate: string, 
    endDate: string, 
    organizationId: string
  ): Promise<Array<{
    user_id: string
    first_name: string
    last_name: string
    total_hours: number
    billable_hours: number
    total_revenue: number
    avg_hourly_rate: number
    entries_count: number
  }>> {
    const query = supabase
      .from('time_entries')
      .select(`
        user_id,
        billable_hours,
        hourly_rate,
        start_time,
        status,
        users!time_entries_user_id_fkey(first_name, last_name)
      `)
      .eq('organization_id', organizationId) // Always filter by organization
      .gte('start_time', startDate)
      .lte('start_time', endDate + 'T23:59:59')
      .in('status', ['approved', 'submitted', 'draft'])

    const { data, error } = await query

    if (error) {
      console.error('Error fetching employee salary data:', error)
      throw new Error(`Failed to fetch employee salary data: ${error.message}`)
    }

    // Group by user and calculate totals
    const employeeData = (data || []).reduce((acc: Record<string, any>, entry: any) => {
      const userId = entry.user_id
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          first_name: entry.users.first_name,
          last_name: entry.users.last_name,
          total_hours: 0,
          billable_hours: 0,
          total_revenue: 0,
          hourly_rates: [],
          entries_count: 0
        }
      }

      const hours = entry.billable_hours || 0
      const rate = entry.hourly_rate || 0
      
      acc[userId].total_hours += hours
      acc[userId].billable_hours += hours
      acc[userId].total_revenue += hours * rate
      if (rate > 0) {
        acc[userId].hourly_rates.push(rate)
      }
      acc[userId].entries_count += 1

      return acc
    }, {})

    // Calculate averages and format
    return Object.values(employeeData).map((emp: any) => ({
      ...emp,
      avg_hourly_rate: emp.hourly_rates.length > 0 
        ? emp.hourly_rates.reduce((sum: number, rate: number) => sum + rate, 0) / emp.hourly_rates.length
        : 0
    }))
  }

  // Get client billing data (billed vs unbilled hours) - ALWAYS filtered by organization
  static async getClientBillingData(
    startDate: string, 
    endDate: string, 
    organizationId: string
  ): Promise<Array<{
    client_id: string
    client_name: string
    total_hours: number
    billable_hours: number
    unbilled_hours: number
    total_revenue: number
    entries_count: number
    billing_status: 'fully_billed' | 'partially_billed' | 'not_billed'
  }>> {
    const query = supabase
      .from('time_entries')
      .select(`
        client_id,
        billable_hours,
        hourly_rate,
        status,
        start_time,
        clients!time_entries_client_id_fkey(name)
      `)
      .eq('organization_id', organizationId) // Always filter by organization
      .gte('start_time', startDate)
      .lte('start_time', endDate + 'T23:59:59')
      .not('client_id', 'is', null)
      .in('status', ['approved', 'submitted', 'draft'])

    const { data, error } = await query

    if (error) {
      console.error('Error fetching client billing data:', error)
      throw new Error('Failed to fetch client billing data')
    }

    // Group by client and calculate totals
    const clientData = (data || []).reduce((acc: Record<string, any>, entry: any) => {
      const clientId = entry.client_id
      if (!acc[clientId]) {
        acc[clientId] = {
          client_id: clientId,
          client_name: entry.clients.name,
          total_hours: 0,
          billable_hours: 0,
          unbilled_hours: 0,
          total_revenue: 0,
          entries_count: 0,
          approved_entries: 0
        }
      }

      const hours = entry.billable_hours || 0
      const rate = entry.hourly_rate || 0
      
      acc[clientId].total_hours += hours
      acc[clientId].billable_hours += hours
      acc[clientId].total_revenue += hours * rate
      acc[clientId].entries_count += 1

      if (entry.status === 'approved') {
        acc[clientId].approved_entries += 1
      }

      return acc
    }, {})

    // Calculate billing status and unbilled hours
    return Object.values(clientData).map((client: any) => {
      const billingRatio = client.approved_entries / client.entries_count
      let billing_status: 'fully_billed' | 'partially_billed' | 'not_billed'
      
      if (billingRatio === 1) {
        billing_status = 'fully_billed'
      } else if (billingRatio > 0) {
        billing_status = 'partially_billed'
      } else {
        billing_status = 'not_billed'
      }

      return {
        ...client,
        unbilled_hours: client.billable_hours * (1 - billingRatio),
        billing_status
      }
    })
  }

  // Get daily/weekly hours data for charts - ALWAYS filtered by organization
  static async getHoursChartData(
    startDate: string, 
    endDate: string, 
    viewType: 'daily' | 'weekly',
    organizationId: string
  ): Promise<Array<{
    period: string
    total_hours: number
    billable_hours: number
    entries_count: number
  }>> {
    const query = supabase
      .from('time_entries')
      .select(`
        start_time,
        billable_hours,
        status
      `)
      .eq('organization_id', organizationId) // Always filter by organization
      .gte('start_time', startDate)
      .lte('start_time', endDate + 'T23:59:59')
      .in('status', ['approved', 'submitted', 'draft'])

    const { data, error } = await query

    if (error) {
      console.error('Error fetching hours chart data:', error)
      throw new Error('Failed to fetch hours chart data')
    }

    const entries = data || []
    const periodData: Record<string, any> = {}

    entries.forEach((entry: any) => {
      const date = new Date(entry.start_time)
      let period: string

      if (viewType === 'daily') {
        period = date.toISOString().split('T')[0]
      } else {
        // Weekly view - get week start (Monday)
        const dayOfWeek = date.getDay()
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        const weekStart = new Date(date.setDate(diff))
        period = weekStart.toISOString().split('T')[0]
      }

      if (!periodData[period]) {
        periodData[period] = {
          period,
          total_hours: 0,
          billable_hours: 0,
          entries_count: 0
        }
      }

      const hours = entry.billable_hours || 0
      periodData[period].total_hours += hours
      periodData[period].billable_hours += hours
      periodData[period].entries_count += 1
    })

    return Object.values(periodData).sort((a: any, b: any) => 
      new Date(a.period).getTime() - new Date(b.period).getTime()
    )
  }

  // Get productivity insights - ALWAYS filtered by organization
  static async getProductivityInsights(
    startDate: string, 
    endDate: string, 
    organizationId: string
  ): Promise<{
    billable_rate: number
    avg_hourly_rate: number
    avg_entry_duration: number
    total_revenue: number
    most_productive_day: string
    least_productive_day: string
    top_performing_employee: string
  }> {
    const query = supabase
      .from('time_entries')
      .select(`
        start_time,
        billable_hours,
        hourly_rate,
        status,
        user_id,
        users!time_entries_user_id_fkey(first_name, last_name)
      `)
      .eq('organization_id', organizationId) // Always filter by organization
      .gte('start_time', startDate)
      .lte('start_time', endDate + 'T23:59:59')
      .in('status', ['approved', 'submitted', 'draft'])

    const { data, error } = await query

    if (error) {
      console.error('Error fetching productivity insights:', error)
      throw new Error('Failed to fetch productivity insights')
    }

    const entries = data || []
    const totalHours = entries.reduce((sum, entry) => sum + (entry.billable_hours || 0), 0)
    const billableHours = entries.filter(e => (e.billable_hours || 0) > 0).reduce((sum, entry) => sum + (entry.billable_hours || 0), 0)
    const totalRevenue = entries.reduce((sum, entry) => sum + ((entry.billable_hours || 0) * (entry.hourly_rate || 0)), 0)
    
    const billableRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0
    const avgHourlyRate = billableHours > 0 ? totalRevenue / billableHours : 0
    const avgEntryDuration = entries.length > 0 ? totalHours / entries.length : 0

    // Calculate most/least productive days
    const dayData: Record<string, number> = {}
    entries.forEach((entry: any) => {
      const day = new Date(entry.start_time).toLocaleDateString('en-US', { weekday: 'long' })
      dayData[day] = (dayData[day] || 0) + (entry.billable_hours || 0)
    })

    const mostProductiveDay = Object.entries(dayData).length > 0 
      ? Object.entries(dayData).reduce((a, b) => dayData[a[0]] > dayData[b[0]] ? a : b)[0] 
      : 'Monday'
    const leastProductiveDay = Object.entries(dayData).length > 0 
      ? Object.entries(dayData).reduce((a, b) => dayData[a[0]] < dayData[b[0]] ? a : b)[0] 
      : 'Sunday'

    // Calculate top performing employee
    const employeeData: Record<string, { name: string; hours: number }> = {}
    entries.forEach((entry: any) => {
      const userId = entry.user_id
      const name = `${entry.users.first_name} ${entry.users.last_name}`.trim()
      if (!employeeData[userId]) {
        employeeData[userId] = { name, hours: 0 }
      }
      employeeData[userId].hours += entry.billable_hours || 0
    })

    const topPerformingEmployee = Object.values(employeeData).length > 0 
      ? Object.values(employeeData).reduce((a, b) => a.hours > b.hours ? a : b).name 
      : 'N/A'

    return {
      billable_rate: Math.round(billableRate * 10) / 10,
      avg_hourly_rate: Math.round(avgHourlyRate * 100) / 100,
      avg_entry_duration: Math.round(avgEntryDuration * 10) / 10,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      most_productive_day: mostProductiveDay,
      least_productive_day: leastProductiveDay,
      top_performing_employee: topPerformingEmployee
    }
  }

  // Get date ranges for current year
  static getCurrentYearRanges(): {
    yearStart: string
    yearEnd: string
    weekStart: string
    weekEnd: string
    monthStart: string
    monthEnd: string
  } {
    const now = new Date()
    const year = now.getFullYear()
    
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`
    
    // Current week
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    
    const weekStart = monday.toISOString().split('T')[0]
    const weekEnd = sunday.toISOString().split('T')[0]
    
    // Current month
    const monthStart = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, now.getMonth() + 1, 0)
    const monthEnd = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    
    return {
      yearStart,
      yearEnd,
      weekStart,
      weekEnd,
      monthStart,
      monthEnd
    }
  }
}
