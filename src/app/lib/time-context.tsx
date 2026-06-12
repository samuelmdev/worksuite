'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './auth-context-multi-org'
import { TimeService, TimeEntry, TimeEntryStats, TimeEntryFilters, WeeklyTimeSlot } from '../../lib/time-service-multi-org'
import { ClientService } from '../../lib/client-service-multi-org'
import { Database } from '../../lib/supabase'

type User = Database['public']['Tables']['users']['Row']
type Client = Database['public']['Tables']['clients']['Row']

interface TimeContextType {
  // Data
  timeEntries: TimeEntry[]
  weeklyTimeSlots: WeeklyTimeSlot[]
  stats: TimeEntryStats
  users: User[]
  clients: Client[]
  
  // Loading states
  loading: boolean
  loadingStats: boolean
  
  // Filters
  filters: TimeEntryFilters
  currentWeek: string
  
  // Actions
  loadTimeEntries: (newFilters?: TimeEntryFilters) => Promise<void>
  loadWeeklyTimeSlots: (weekStart?: string) => Promise<void>
  loadStats: () => Promise<void>
  loadUsers: () => Promise<void>
  loadClients: () => Promise<void>
  createTimeEntry: (entryData: any) => Promise<TimeEntry>
  updateTimeEntry: (id: string, updates: any) => Promise<TimeEntry>
  deleteTimeEntry: (id: string) => Promise<void>
  approveTimeEntry: (id: string) => Promise<TimeEntry>
  rejectTimeEntry: (id: string, reason?: string) => Promise<TimeEntry>
  
  // Filter actions
  setFilters: (filters: TimeEntryFilters) => void
  clearFilters: () => void
  
  // Week navigation
  goToPreviousWeek: () => void
  goToNextWeek: () => void
  goToCurrentWeek: () => void
}

const TimeContext = createContext<TimeContextType | undefined>(undefined)

export function TimeProvider({ children }: { children: ReactNode }) {
  const { user, currentOrganization } = useAuth()
  
  // Data state
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [weeklyTimeSlots, setWeeklyTimeSlots] = useState<WeeklyTimeSlot[]>([])
  const [stats, setStats] = useState<TimeEntryStats>({})
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  
  // Loading states
  const [loading, setLoading] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  
  // Filters and current week
  const [filters, setFiltersState] = useState<TimeEntryFilters>({})
  const [currentWeek, setCurrentWeek] = useState(TimeService.getCurrentWeekStart())

  // Load time entries
  const loadTimeEntries = async (newFilters?: TimeEntryFilters) => {
    try {
      setLoading(true)
      
      // For employees, only show their own entries
      const finalFilters = currentOrganization?.role === 'employee' 
        ? { ...filters, ...newFilters, user_id: user?.id }
        : { ...filters, ...newFilters }
      
      if (!currentOrganization?.id) {
        console.log('Time Context: No organization selected, skipping time entries fetch')
        return
      }
      const entries = await TimeService.getTimeEntries(finalFilters, currentOrganization.id)
      setTimeEntries(entries)
      
      // Update filters state
      if (newFilters) {
        setFiltersState(finalFilters)
      }
    } catch (error) {
      console.error('Error loading time entries:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load weekly time slots
  const loadWeeklyTimeSlots = async (weekStart?: string) => {
    try {
      const week = weekStart || currentWeek
      const finalFilters = currentOrganization?.role === 'employee' 
        ? { ...filters, user_id: user?.id }
        : filters
      
      if (!currentOrganization?.id) {
        console.log('Time Context: No organization selected, skipping weekly entries fetch')
        return
      }
      const slots = await TimeService.getWeeklyTimeEntries(week, finalFilters, currentOrganization.id)
      setWeeklyTimeSlots(slots)
    } catch (error) {
      console.error('Error loading weekly time slots:', error)
    }
  }

  // Load statistics
  const loadStats = async () => {
    try {
      setLoadingStats(true)
      
      // For employees, only show their own stats
      const userId = currentOrganization?.role === 'employee' ? user?.id : undefined
      if (!currentOrganization?.id) {
        console.log('Time Context: No organization selected, skipping stats fetch')
        return
      }
      const statsData = await TimeService.getTimeEntryStats(userId, undefined, undefined, currentOrganization.id)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  // Load users (admin/manager only)
  const loadUsers = async () => {
    if (currentOrganization?.role !== 'admin' && currentOrganization?.role !== 'manager') {
      return
    }

    try {
      if (!currentOrganization?.id) {
        console.log('Time Context: No organization selected, skipping users fetch')
        return
      }
      const usersData = await ClientService.getUsers(currentOrganization.id)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  // Load clients
  const loadClients = async () => {
    try {
      if (!currentOrganization?.id) {
        console.log('Time Context: No organization selected, skipping clients fetch')
        return
      }
      const clientsData = await ClientService.getClients(currentOrganization.id)
      setClients(clientsData)
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  // Create time entry
  const createTimeEntry = async (entryData: any): Promise<TimeEntry> => {
    if (!currentOrganization?.id) {
      throw new Error('No organization selected')
    }
    const entry = await TimeService.createTimeEntry({ ...entryData, organization_id: currentOrganization.id })
    await loadTimeEntries()
    await loadWeeklyTimeSlots()
    await loadStats()
    return entry
  }

  // Update time entry
  const updateTimeEntry = async (id: string, updates: any): Promise<TimeEntry> => {
    if (!currentOrganization?.id) {
      throw new Error('No organization selected')
    }
    const entry = await TimeService.updateTimeEntry(id, updates, currentOrganization.id)
    await loadTimeEntries()
    await loadWeeklyTimeSlots()
    await loadStats()
    return entry
  }

  // Delete time entry
  const deleteTimeEntry = async (id: string): Promise<void> => {
    if (!currentOrganization?.id) {
      throw new Error('No organization selected')
    }
    await TimeService.deleteTimeEntry(id, currentOrganization.id)
    await loadTimeEntries()
    await loadWeeklyTimeSlots()
    await loadStats()
  }

  // Approve time entry (admin/manager only)
  const approveTimeEntry = async (id: string): Promise<TimeEntry> => {
    if (currentOrganization?.role !== 'admin' && currentOrganization?.role !== 'manager') {
      throw new Error('Insufficient permissions')
    }
    
    if (!currentOrganization?.id) {
      throw new Error('No organization selected')
    }
    const entry = await TimeService.approveTimeEntry(id, currentOrganization.id)
    await loadTimeEntries()
    await loadWeeklyTimeSlots()
    await loadStats()
    return entry
  }

  // Reject time entry (admin/manager only)
  const rejectTimeEntry = async (id: string, reason?: string): Promise<TimeEntry> => {
    if (currentOrganization?.role !== 'admin' && currentOrganization?.role !== 'manager') {
      throw new Error('Insufficient permissions')
    }
    
    if (!currentOrganization?.id) {
      throw new Error('No organization selected')
    }
    const entry = await TimeService.rejectTimeEntry(id, currentOrganization.id, reason)
    await loadTimeEntries()
    await loadWeeklyTimeSlots()
    await loadStats()
    return entry
  }

  // Filter actions
  const setFilters = (newFilters: TimeEntryFilters) => {
    setFiltersState(newFilters)
    loadTimeEntries(newFilters)
  }

  const clearFilters = () => {
    setFiltersState({})
    loadTimeEntries({})
  }

  // Week navigation
  const goToPreviousWeek = () => {
    const current = new Date(currentWeek)
    current.setDate(current.getDate() - 7)
    const newWeek = current.toISOString().split('T')[0]
    setCurrentWeek(newWeek)
    loadWeeklyTimeSlots(newWeek)
  }

  const goToNextWeek = () => {
    const current = new Date(currentWeek)
    current.setDate(current.getDate() + 7)
    const newWeek = current.toISOString().split('T')[0]
    setCurrentWeek(newWeek)
    loadWeeklyTimeSlots(newWeek)
  }

  const goToCurrentWeek = () => {
    const week = TimeService.getCurrentWeekStart()
    setCurrentWeek(week)
    loadWeeklyTimeSlots(week)
  }

  // Initial data load
  useEffect(() => {
    if (user && currentOrganization?.id) {
      loadTimeEntries()
      loadWeeklyTimeSlots()
      loadStats()
      loadClients()
      
      // Only load users for admin/manager
      if (currentOrganization.role === 'admin' || currentOrganization.role === 'manager') {
        loadUsers()
      }
    }
  }, [user, currentOrganization?.id])

  const value: TimeContextType = {
    // Data
    timeEntries,
    weeklyTimeSlots,
    stats,
    users,
    clients,
    
    // Loading states
    loading,
    loadingStats,
    
    // Filters
    filters,
    currentWeek,
    
    // Actions
    loadTimeEntries,
    loadWeeklyTimeSlots,
    loadStats,
    loadUsers,
    loadClients,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    approveTimeEntry,
    rejectTimeEntry,
    
    // Filter actions
    setFilters,
    clearFilters,
    
    // Week navigation
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek
  }

  return (
    <TimeContext.Provider value={value}>
      {children}
    </TimeContext.Provider>
  )
}

export function useTime() {
  const context = useContext(TimeContext)
  if (context === undefined) {
    throw new Error('useTime must be used within a TimeProvider')
  }
  return context
}
