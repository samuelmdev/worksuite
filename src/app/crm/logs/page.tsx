'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle, 
  Clock,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText as PDFIcon,
  Plus
} from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import ActivityLogModal from '../../components/ActivityLogModal'
import { activityService, ClientActivity } from '../../../lib/activity-service'
import { ClientService } from '../../../lib/client-service-multi-org'
import { useAuth } from '../../lib/auth-context-multi-org'
import { Database } from '../../../lib/supabase'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

type Client = Database['public']['Tables']['clients']['Row']

const activityTypes: { value: string; labelKey: TranslationKey }[] = [
  { value: 'call', labelKey: 'modal.activity.type.call' },
  { value: 'email', labelKey: 'modal.activity.type.email' },
  { value: 'meeting', labelKey: 'modal.activity.type.meeting' },
  { value: 'note', labelKey: 'modal.activity.type.note' },
  { value: 'task', labelKey: 'modal.activity.type.task' },
]

const getActivityTypeLabelKey = (type: string): TranslationKey => {
  return activityTypes.find(a => a.value === type)?.labelKey ?? 'modal.activity.type.note'
}

export default function ClientLogsPage() {
  const { currentOrganization } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLocale()
  
  const [logs, setLogs] = useState<ClientActivity[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  
  // UI state
  const [showFilters, setShowFilters] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)

  // Load initial data
  useEffect(() => {
    loadClients()
    loadLogs()
  }, [currentOrganization?.id])

  // Handle URL parameters for filtering
  useEffect(() => {
    const clientParam = searchParams.get('client')
    const typeParam = searchParams.get('type')
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')
    
    console.log('URL Parameters:', { clientParam, typeParam, startParam, endParam })
    
    if (clientParam) {
      setSelectedClient(clientParam)
      console.log('Set selected client to:', clientParam)
    }
    if (typeParam) setSelectedType(typeParam)
    if (startParam) setDateRange(prev => ({ ...prev, start: startParam }))
    if (endParam) setDateRange(prev => ({ ...prev, end: endParam }))
  }, [searchParams])

  // Reload logs when filters change
  useEffect(() => {
    loadLogs()
  }, [selectedClient, selectedType, dateRange])

  const loadClients = async () => {
    if (!currentOrganization?.id) return
    try {
      const clientData = await ClientService.getClients(currentOrganization.id)
      setClients(clientData || [])
    } catch (err) {
      console.error('Error loading clients:', err)
    }
  }

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading logs with filters:', { selectedClient, selectedType, dateRange })
      
      // Get all client activities with filters
      let allLogs: ClientActivity[] = []
      
      if (selectedClient) {
        console.log('Loading logs for specific client:', selectedClient)
        // Load logs for specific client
        allLogs = await activityService.getClientActivities(selectedClient, 1000)
        console.log('Loaded logs for client:', allLogs.length)
      } else {
        console.log('Loading logs for all clients')
        // Load logs for all clients
        allLogs = await activityService.getAllClientActivitiesOrg(1000)
        console.log('Loaded logs for all clients:', allLogs.length)
      }
      
      // Apply client-side filters
      let filteredLogs = allLogs
      
      // Filter by type
      if (selectedType) {
        filteredLogs = filteredLogs.filter(log => log.type === selectedType)
      }
      
      // Filter by date range
      if (dateRange.start) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.created_at) >= new Date(dateRange.start)
        )
      }
      if (dateRange.end) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.created_at) <= new Date(dateRange.end)
        )
      }
      
      // Filter by search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        filteredLogs = filteredLogs.filter(log => 
          log.subject.toLowerCase().includes(term) ||
          log.description?.toLowerCase().includes(term) ||
          log.user?.first_name?.toLowerCase().includes(term) ||
          log.user?.last_name?.toLowerCase().includes(term)
        )
      }
      
      // Sort by date (newest first)
      filteredLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setLogs(filteredLogs)
    } catch (err) {
      console.error('Error loading logs:', err)
      setError(t('common.error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="w-4 h-4" />
      case 'email': return <Mail className="w-4 h-4" />
      case 'meeting': return <Calendar className="w-4 h-4" />
      case 'note': return <FileText className="w-4 h-4" />
      case 'task': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getLogColor = (type: string) => {
    switch (type) {
      case 'call': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
      case 'email': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
      case 'meeting': return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20'
      case 'note': return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20'
      case 'task': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    return activityService.formatTimeAgo(dateString)
  }

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    console.log('Looking for client:', clientId, 'Found:', client?.name)
    return client ? client.name : `Client ${clientId.slice(0, 8)}...`
  }

  const exportToExcel = () => {
    // TODO: Implement Excel export
    console.log('Export to Excel not implemented yet')
  }

  const exportToPDF = () => {
    // TODO: Implement PDF export
    console.log('Export to PDF not implemented yet')
  }

  const handleActivityLogged = () => {
    // Reload logs when a new activity is logged
    loadLogs()
  }

  if (loading) {
    return (
      <RoleGuard>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">{t('crm.logsPage.loading')}</p>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{t('crm.logsPage.title')}</h1>
                <p className="text-gray-600 dark:text-slate-400 mt-2">
                  {t('crm.logsPage.subtitle')}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsActivityModalOpen(true)}
                className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white shape-sm transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('crm.logsPage.add')}
              </motion.button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
            <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('common.filters')}</h2>
                {selectedClient && (
                  <p className="text-sm text-cyan-600 dark:text-cyan-400 mt-1">
                    Filtering by client: {getClientName(selectedClient)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 shape-sm hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? t('common.hideFilters') : t('common.showFilters')}
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('crm.logsPage.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Client Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      {t('common.client')}
                    </label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
                    >
                      <option value="">{t('crm.logsPage.filter.client')}</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      {t('modal.activity.activityType')}
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
                    >
                      <option value="">{t('crm.logsPage.filter.type')}</option>
                      {activityTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {t(type.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      {t('crm.reportsPage.dateRange')}
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
                        aria-label={t('crm.logsPage.filter.dateFrom')}
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
                        aria-label={t('crm.logsPage.filter.dateTo')}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {t('common.resultsCount', { count: logs.length })}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToExcel}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 shape-sm hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('crm.logsPage.export.excel')}
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 shape-sm hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                <PDFIcon className="w-4 h-4 mr-2" />
                {t('crm.logsPage.export.pdf')}
              </button>
            </div>
          </div>

          {/* Logs List */}
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={loadLogs}
                className="px-4 py-2 text-sm font-medium text-cyan-600 bg-cyan-50 border border-cyan-200 shape-sm hover:bg-cyan-100"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">{t('crm.logsPage.empty.title')}</h3>
              <p className="text-gray-500 dark:text-slate-400">
                {searchTerm || selectedClient || selectedType || dateRange.start || dateRange.end
                  ? t('crm.logsPage.empty.filtered')
                  : t('crm.logsPage.empty.desc')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id)
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getLogColor(log.type)}`}>
                            {getLogIcon(log.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                {log.subject}
                              </h3>
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-full">
                                {t(getActivityTypeLabelKey(log.type))}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-slate-400">
                              <span>{t('common.client')}: {getClientName(log.client_id)}</span>
                              <span>•</span>
                              <span>by {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Unknown User'}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(log.created_at)}</span>
                            </div>
                            {log.description && (
                              <div className="mt-2">
                                <p className={`text-sm text-gray-600 dark:text-slate-300 ${!isExpanded && log.description.length > 100 ? 'line-clamp-2' : ''}`}>
                                  {log.description}
                                </p>
                                {log.description.length > 100 && (
                                  <button
                                    onClick={() => toggleLogExpansion(log.id)}
                                    className="mt-1 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
                                  >
                                    {isExpanded ? 'Show less' : 'Show more'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Activity Log Modal */}
      <ActivityLogModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        clients={clients}
        onActivityLogged={handleActivityLogged}
      />
    </RoleGuard>
  )
}
