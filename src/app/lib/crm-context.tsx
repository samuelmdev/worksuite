'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ClientService } from '../../lib/client-service-multi-org'
import { ContractsService } from '../../lib/contracts-service-multi-org'
import { TasksService } from '../../lib/tasks-service'
import { activityService, ActivityLog, ActivityStats } from '../../lib/activity-service'
import { useAuth } from './auth-context-multi-org'

// Extended stats type that includes our custom properties
interface CRMStats extends ActivityStats {
  total_clients?: number
  client_change_percentage?: number
  active_contracts?: number
  contract_change_percentage?: number
  monthly_revenue?: number
  revenue_change_percentage?: number
  pending_tasks?: number
  tasks_change_percentage?: number
}
import { Client } from '../components/ClientModal'

interface CRMContextType {
  // Data
  clients: Client[]
  stats: CRMStats
  recentActivities: ActivityLog[]
  
  // Loading states
  loading: {
    clients: boolean
    stats: boolean
    activities: boolean
    tasks: boolean
  }
  
  // Error states
  errors: {
    clients: string | null
    stats: string | null
    activities: string | null
    tasks: string | null
  }
  
  // Actions
  refreshClients: () => Promise<void>
  refreshStats: () => Promise<void>
  refreshActivities: () => Promise<void>
  refreshTasks: () => Promise<void>
  refreshAll: () => Promise<void>
  
  // Client actions
  addClient: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateClient: (id: string, clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
}

const CRMContext = createContext<CRMContextType | undefined>(undefined)

export function useCRM() {
  const context = useContext(CRMContext)
  if (context === undefined) {
    throw new Error('useCRM must be used within a CRMProvider')
  }
  return context
}

interface CRMProviderProps {
  children: ReactNode
}

export function CRMProvider({ children }: CRMProviderProps) {
  const { currentOrganization } = useAuth()
  
  // Data state
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<CRMStats>({})
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([])
  
  // Loading states
  const [loading, setLoading] = useState({
    clients: false,
    stats: false,
    activities: false,
    tasks: false
  })
  
  // Error states
  const [errors, setErrors] = useState({
    clients: null as string | null,
    stats: null as string | null,
    activities: null as string | null,
    tasks: null as string | null
  })

  // Ref to track if refresh is in progress to prevent race conditions
  const refreshInProgressRef = React.useRef(false)
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Convert database client to component format
  const convertClient = (dbClient: any): Client => ({
    id: dbClient.id,
    name: dbClient.name,
    email: dbClient.email || '',
    phone: dbClient.phone || '',
    company: dbClient.company || '',
    address: dbClient.address || '',
    notes: dbClient.notes || '',
    status: dbClient.status || undefined,
    isBlocked: dbClient.is_blocked ?? false,
    blockReason: dbClient.block_reason || undefined,
    blockedAt: dbClient.blocked_at || undefined,
    createdAt: dbClient.created_at,
    updatedAt: dbClient.updated_at
  })

  // Helper function to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      promise
        .then(value => { clearTimeout(timer); resolve(value) })
        .catch(err => { clearTimeout(timer); reject(err) })
    })
  }

  // Fetch clients
  const refreshClients = async () => {
    setLoading(prev => ({ ...prev, clients: true }))
    setErrors(prev => ({ ...prev, clients: null }))
    
    try {
      if (!currentOrganization?.id) {
        return
      }
      const databaseClients = await withTimeout(ClientService.getClients(currentOrganization.id), 30000)
      setClients(databaseClients.map(convertClient))
    } catch (error) {
      console.error('CRM Context: Error fetching clients:', error)
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn('CRM Context: Clients fetch timed out')
      } else {
        setErrors(prev => ({ ...prev, clients: 'Failed to load clients' }))
      }
    } finally {
      setLoading(prev => ({ ...prev, clients: false }))
    }
  }

  // Fetch stats
  const refreshStats = async () => {
    setLoading(prev => ({ ...prev, stats: true }))
    setErrors(prev => ({ ...prev, stats: null }))

    if (!currentOrganization?.id) {
      setLoading(prev => ({ ...prev, stats: false }))
      return
    }

    try {
      const orgId = currentOrganization.id

      const [clientResult, activityResult, contractResult, taskResult] = await Promise.allSettled([
        withTimeout(ClientService.getClientStats(orgId), 20000),
        withTimeout(activityService.getActivityStats('crm'), 15000),
        withTimeout(ContractsService.getContractStats(orgId), 15000),
        withTimeout(TasksService.getTaskStats(), 15000),
      ])

      const clientStats = clientResult.status === 'fulfilled'
        ? clientResult.value
        : { total_clients: 0, active_clients: 0, recent_clients: 0, change_from_last_month: 0 }

      const activityStats = activityResult.status === 'fulfilled' ? activityResult.value : {}
      const contractStats = contractResult.status === 'fulfilled'
        ? contractResult.value
        : {
            total_contracts: 0,
            active_contracts: 0,
            monthly_recurring_revenue: 0,
            active_contracts_change_from_last_month: 0,
            revenue_change_from_last_month: 0,
          }
      const taskStats = taskResult.status === 'fulfilled'
        ? taskResult.value
        : { pending: 0, changeFromLastMonth: 0 }

      ;[clientResult, activityResult, contractResult, taskResult].forEach((result, index) => {
        if (result.status === 'rejected') {
          const names = ['client stats', 'activity stats', 'contract stats', 'task stats']
          console.warn(`CRM Context: ${names[index]} unavailable:`, result.reason)
        }
      })

      setStats({
        ...activityStats,
        total_clients: clientStats.total_clients,
        client_change_percentage: clientStats.change_from_last_month ?? 0,
        active_contracts: contractStats.active_contracts ?? contractStats.total_contracts ?? 0,
        contract_change_percentage: contractStats.active_contracts_change_from_last_month ?? 0,
        monthly_revenue: contractStats.monthly_recurring_revenue ?? 0,
        revenue_change_percentage: contractStats.revenue_change_from_last_month ?? 0,
        pending_tasks: taskStats.pending ?? 0,
        tasks_change_percentage: taskStats.changeFromLastMonth ?? 0,
      })
    } catch (error) {
      console.error('CRM Context: Error fetching stats:', error)
      if (!(error instanceof Error && error.message.includes('timeout'))) {
        setErrors(prev => ({ ...prev, stats: 'Failed to load statistics' }))
      }
    } finally {
      setLoading(prev => ({ ...prev, stats: false }))
    }
  }

  // Fetch task statistics
  const refreshTasks = async () => {
    console.log('CRM Context: Fetching task stats...')
    setLoading(prev => ({ ...prev, tasks: true }))
    setErrors(prev => ({ ...prev, tasks: null }))
    
    try {
      const taskStats = await withTimeout(TasksService.getTaskStats(), 5000)
      console.log('CRM Context: Fetched task stats:', taskStats)
      
      setStats(prev => ({
        ...prev,
        pending_tasks: taskStats.pending,
        tasks_change_percentage: taskStats.changeFromLastMonth
      }))
    } catch (error) {
      console.warn('CRM Context: Task stats not available:', error)
      setErrors(prev => ({ ...prev, tasks: 'Failed to load task statistics' }))
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }))
      console.log('CRM Context: Task stats loading finished')
    }
  }

  // Fetch activities
  const refreshActivities = async () => {
    setLoading(prev => ({ ...prev, activities: true }))
    setErrors(prev => ({ ...prev, activities: null }))

    try {
      const activities = await withTimeout(activityService.getRecentActivities('crm', 10), 15000)
      setRecentActivities(activities)
    } catch (error) {
      console.warn('CRM Context: Activities not available:', error)
      setRecentActivities([])
      if (!(error instanceof Error && error.message.includes('timeout'))) {
        setErrors(prev => ({ ...prev, activities: 'Failed to load activities' }))
      }
    } finally {
      setLoading(prev => ({ ...prev, activities: false }))
    }
  }

  // Internal refresh function
  const _refreshAll = async () => {
    console.log('CRM Context: Starting _refreshAll...')
    
    // Prevent multiple simultaneous refreshAll calls using ref
    if (refreshInProgressRef.current) {
      console.log('CRM Context: Refresh already in progress, skipping...')
      return
    }
    
    refreshInProgressRef.current = true
    
    try {
      // Use Promise.allSettled to ensure all calls complete even if some fail
      const results = await Promise.allSettled([
        refreshClients(),
        refreshStats(),
        refreshActivities(),
        refreshTasks()
      ])
      
      // Log any failures but don't throw
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const serviceNames = ['clients', 'stats', 'activities', 'tasks']
          console.warn(`CRM Context: ${serviceNames[index]} refresh failed:`, result.reason)
        }
      })
      
      console.log('CRM Context: _refreshAll completed')
    } catch (error) {
      console.error('CRM Context: _refreshAll failed:', error)
    } finally {
      refreshInProgressRef.current = false
    }
  }

  // Debounced refresh function to prevent too many rapid calls
  const refreshAll = async (): Promise<void> => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    // Set a new timeout and return a promise
    return new Promise((resolve) => {
      refreshTimeoutRef.current = setTimeout(async () => {
        await _refreshAll()
        resolve()
      }, 100) // 100ms debounce
    })
  }

  // Client actions
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected')
      }
      const newClient = await ClientService.createClient({ ...clientData, organization_id: currentOrganization.id } as any)
      const convertedClient = convertClient(newClient)
      setClients(prev => [convertedClient, ...prev])
      // Refresh stats to update counts
      await refreshStats()
    } catch (error) {
      console.error('Error adding client:', error)
      throw error
    }
  }

  const updateClient = async (id: string, clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected')
      }
      const updatedClient = await ClientService.updateClient(id, clientData as any, currentOrganization.id)
      const convertedClient = convertClient(updatedClient)
      setClients(prev => prev.map(client => 
        client.id === id ? convertedClient : client
      ))
      // Refresh stats to update counts
      await refreshStats()
    } catch (error) {
      console.error('Error updating client:', error)
      throw error
    }
  }

  const deleteClient = async (id: string) => {
    try {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected')
      }
      await ClientService.deleteClient(id, currentOrganization.id)
      setClients(prev => prev.filter(client => client.id !== id))
      // Refresh stats to update counts
      await refreshStats()
    } catch (error) {
      console.error('Error deleting client:', error)
      throw error
    }
  }

  // Initial data load - only when organization is available
  useEffect(() => {
    if (currentOrganization?.id) {
      console.log('CRM Context: Starting initial data load for organization:', currentOrganization.id)
      _refreshAll().then(() => {
        console.log('CRM Context: Initial data load completed')
      }).catch((error) => {
        console.error('CRM Context: Initial data load failed:', error)
      })
    } else {
      console.log('CRM Context: No organization available for initial data load')
    }
  }, [currentOrganization?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear data when no organization is selected
  useEffect(() => {
    if (!currentOrganization?.id) {
      console.log('CRM Context: No organization selected, clearing data')
      setClients([])
      setStats({})
      setRecentActivities([])
    }
  }, [currentOrganization?.id])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const value: CRMContextType = {
    clients,
    stats,
    recentActivities,
    loading,
    errors,
    refreshClients,
    refreshStats,
    refreshActivities,
    refreshTasks,
    refreshAll,
    addClient,
    updateClient,
    deleteClient
  }

  return (
    <CRMContext.Provider value={value}>
      {children}
    </CRMContext.Provider>
  )
}
