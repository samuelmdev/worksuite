'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, Edit, Trash2, Mail, Phone, Building, MapPin, Download, FileText, FileSpreadsheet, Filter, ChevronRight, ChevronDown, Calendar, FileText as ContractIcon, CheckSquare, Clock, ExternalLink, MoreVertical, Ban, Shield, Loader2 } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import ClientModal, { Client } from '../../components/ClientModal'
import ContractModal from '../../components/ContractModal'
import TaskModal from '../../components/TaskModal'
import DealModal from '../../components/DealModal'
import ActivityLogModal from '../../components/ActivityLogModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { exportToExcel, exportToPDF, getExportFilename, ExportableClient } from '../../../lib/export-utils'
import { useCRM } from '../../lib/crm-context'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'
import { ContractsService } from '../../../lib/contracts-service-multi-org'
import { TasksService } from '../../../lib/tasks-service'
import { ClientService } from '../../../lib/client-service'
import { activityService } from '../../../lib/activity-service'
import { useAuth } from '../../lib/auth-context-multi-org'

const filterOptions: { value: string; labelKey: TranslationKey }[] = [
  { value: 'all', labelKey: 'crm.clients.filter.all' },
  { value: 'active', labelKey: 'crm.clients.filter.active' },
  { value: 'inactive', labelKey: 'crm.clients.filter.inactive' },
  { value: 'blocked', labelKey: 'crm.clients.filter.blocked' },
  { value: 'with-notes', labelKey: 'crm.clients.filter.withNotes' },
  { value: 'recent', labelKey: 'crm.clients.filter.recent' },
]

export default function CRMClientsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLocale()
  const { clients, loading, errors, addClient, updateClient, deleteClient } = useCRM()
  const { currentOrganization } = useAuth()
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [clientContracts, setClientContracts] = useState<Record<string, any[]>>({})
  const [clientTasks, setClientTasks] = useState<Record<string, any[]>>({})
  const [clientLogsCount, setClientLogsCount] = useState<Record<string, number>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})
  const [showBlockMenu, setShowBlockMenu] = useState<string | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
  const [clientToBlock, setClientToBlock] = useState<Client | null>(null)
  const [isContractTerminationDialogOpen, setIsContractTerminationDialogOpen] = useState(false)
  const [activeContractsCount, setActiveContractsCount] = useState(0)
  
  // Modal states
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [preselectedClient, setPreselectedClient] = useState<Client | null>(null)

  // Debug logging
  console.log('CRM Clients: clients:', clients.length)
  console.log('CRM Clients: loading:', loading)
  console.log('CRM Clients: errors:', errors)
  console.log('CRM Clients: sample client data:', clients[0])


  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu) {
        const target = event.target as Element
        if (!target.closest('.export-menu')) {
          setShowExportMenu(false)
        }
      }
      if (showBlockMenu) {
        const target = event.target as Element
        if (!target.closest('.block-menu')) {
          setShowBlockMenu(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu, showBlockMenu])

  // Filter clients based on search term and filter type
  useEffect(() => {
    let filtered = clients

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(client => {
        switch (filterType) {
          case 'active':
            return (client.status === 'active' || !client.status) && !client.isBlocked
          case 'inactive':
            return client.status === 'inactive' && !client.isBlocked
          case 'blocked':
            return client.isBlocked === true
          case 'with-notes':
            return client.notes && client.notes.trim().length > 0
          case 'recent':
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            return new Date(client.createdAt) > thirtyDaysAgo
          default:
            return true
        }
      })
    }

    setFilteredClients(filtered)
  }, [searchTerm, filterType, clients])

  // Handle URL parameters
  useEffect(() => {
    const statusParam = searchParams.get('status')
    
    if (statusParam) {
      setFilterType(statusParam)
    }
  }, [searchParams])

  const handleAddClient = () => {
    setSelectedClient(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client)
    setIsDeleteDialogOpen(true)
  }

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null)
      
      if (modalMode === 'create') {
        await addClient(clientData)
      } else if (selectedClient) {
        await updateClient(selectedClient.id, clientData)
      }
    } catch (err) {
      console.error('Error saving client:', err)
      setError(t('crm.clients.error.save'))
    }
  }

  const handleConfirmDelete = async () => {
    if (selectedClient) {
      try {
        setError(null)
        await deleteClient(selectedClient.id)
        setIsDeleteDialogOpen(false)
        setSelectedClient(null)
      } catch (err) {
        console.error('Error deleting client:', err)
        setError(t('crm.clients.error.delete'))
      }
    }
  }

  const handleExportExcel = () => {
    const exportData: ExportableClient[] = filteredClients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      address: client.address,
      notes: client.notes,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    }))
    
    const filename = getExportFilename(filterType, searchTerm)
    exportToExcel(exportData, filename)
    setShowExportMenu(false)
  }

  const handleExportPDF = () => {
    const exportData: ExportableClient[] = filteredClients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      address: client.address,
      notes: client.notes,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    }))
    
    const filename = getExportFilename(filterType, searchTerm)
    exportToPDF(exportData, filename)
    setShowExportMenu(false)
  }

  const handleViewClient = (client: Client) => {
    router.push(`/crm/clients/${client.id}`)
  }

  const handleViewClientContracts = (client: Client) => {
    router.push(`/crm/contracts?client=${encodeURIComponent(client.name)}`)
  }

  const handleViewClientTasks = (client: Client) => {
    router.push(`/crm/tasks?client=${encodeURIComponent(client.name)}`)
  }

  const handleViewClientLogs = (client: Client) => {
    router.push(`/crm/logs?client=${client.id}`)
  }

  const toggleClientExpansion = async (clientId: string) => {
    const isExpanded = expandedClients.has(clientId)

    if (isExpanded) {
      setExpandedClients(prev => {
        const next = new Set(prev)
        next.delete(clientId)
        return next
      })
      return
    }

    setExpandedClients(prev => new Set(prev).add(clientId))

    if (!clientContracts[clientId] && !clientTasks[clientId]) {
      if (!currentOrganization?.id) return

      setLoadingDetails(prev => ({ ...prev, [clientId]: true }))

      try {
        const [allContracts, tasks] = await Promise.all([
          ContractsService.getContracts(currentOrganization.id),
          TasksService.getTasks({ client_id: clientId }),
        ])

        setClientContracts(prev => ({
          ...prev,
          [clientId]: allContracts.filter(c => c.client_id === clientId),
        }))
        setClientTasks(prev => ({ ...prev, [clientId]: tasks }))

        try {
          const logsStats = await activityService.getClientInteractionStats(clientId)
          setClientLogsCount(prev => ({ ...prev, [clientId]: logsStats.total_interactions || 0 }))
        } catch {
          setClientLogsCount(prev => ({ ...prev, [clientId]: 0 }))
        }
      } catch (err) {
        console.error('Error fetching client details:', err)
      } finally {
        setLoadingDetails(prev => ({ ...prev, [clientId]: false }))
      }
    }
  }

  const handleBlockClient = async (client: Client) => {
    if (!currentOrganization?.id) return

    try {
      const allContracts = await ContractsService.getContracts(currentOrganization.id)
      
      const activeContracts = allContracts.filter(contract => 
        contract.client_id === client.id && contract.status === 'active'
      )
      
      if (activeContracts.length > 0) {
        // Show contract termination dialog
        setClientToBlock(client)
        setBlockReason('')
        setActiveContractsCount(activeContracts.length)
        setIsContractTerminationDialogOpen(true)
      } else {
        // No active contracts, proceed with normal blocking
        setClientToBlock(client)
        setBlockReason('')
        setIsBlockDialogOpen(true)
      }
      setShowBlockMenu(null)
    } catch (err) {
      console.error('Error checking contracts:', err)
      setError(t('crm.clients.error.checkContracts'))
    }
  }

  const handleUnblockClient = async (client: Client) => {
    try {
      setError(null)
      await ClientService.unblockClient(client.id)
      // Refresh the client data
      window.location.reload() // Simple refresh for now
    } catch (err) {
      console.error('Error unblocking client:', err)
      setError(t('crm.clients.error.unblock'))
    }
  }

  const handleTerminateContractsAndBlock = async () => {
    if (clientToBlock && blockReason.trim() && currentOrganization?.id) {
      try {
        setError(null)
        
        // First terminate all active contracts
        const allContracts = await ContractsService.getContracts(currentOrganization.id)
        const activeContracts = allContracts.filter(contract => 
          contract.client_id === clientToBlock.id && contract.status === 'active'
        )
        
        // Terminate each contract
        for (const contract of activeContracts) {
          await ContractsService.updateContract(contract.id, {
            status: 'cancelled',
            end_date: new Date().toISOString()
          }, currentOrganization.id)
        }
        
        // Then block the client
        await ClientService.blockClient(clientToBlock.id, blockReason.trim())
        
        setIsContractTerminationDialogOpen(false)
        setClientToBlock(null)
        setBlockReason('')
        setActiveContractsCount(0)
        // Refresh the client data
        window.location.reload() // Simple refresh for now
      } catch (err) {
        console.error('Error terminating contracts and blocking client:', err)
        setError(t('crm.clients.error.terminateAndBlock'))
      }
    }
  }

  const handleConfirmBlock = async () => {
    if (clientToBlock && blockReason.trim()) {
      try {
        setError(null)
        await ClientService.blockClient(clientToBlock.id, blockReason.trim())
        setIsBlockDialogOpen(false)
        setClientToBlock(null)
        setBlockReason('')
        // Refresh the client data
        window.location.reload() // Simple refresh for now
      } catch (err) {
        console.error('Error blocking client:', err)
        setError(t('crm.clients.error.block'))
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('crm.clients.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('crm.clients.subtitle')}
            </p>
            {(error || errors.clients) && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error || errors.clients}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Export Button */}
            <div className="relative export-menu">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('common.export')}
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-10">
                  <div className="py-1">
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-3" />
                      {t('crm.clients.export.excel')}
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <FileText className="w-4 h-4 mr-3" />
                      {t('crm.clients.export.pdf')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleAddClient}
              className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('crm.clients.add')}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('crm.clients.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 appearance-none bg-white dark:bg-slate-700"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            {t('crm.clients.results.showing', { shown: filteredClients.length, total: clients.length })}
            {searchTerm && ` ${t('crm.clients.results.matching', { term: searchTerm })}`}
            {filterType !== 'all' && ` ${t('crm.clients.results.filterApplied', { filter: filterType })}`}
          </span>
        </div>

        {/* Client List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          {loading.clients ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('crm.clients.loading')}</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              {clients.length === 0 ? (
                // No clients at all
                <>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                    {t('crm.clients.empty.title')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t('crm.clients.empty.desc')}
                  </p>
                  <button
                    onClick={handleAddClient}
                    className="inline-flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('crm.clients.addFirst')}
                  </button>
                </>
              ) : (
                // Clients exist but filter shows none
                <>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                    {searchTerm 
                      ? t('crm.clients.empty.notFound')
                      : filterType === 'all'
                        ? t('crm.clients.empty.notFound')
                        : t('crm.clients.empty.filterNoMatch', { filter: filterType })
                    }
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {searchTerm 
                      ? t('crm.clients.empty.trySearch')
                      : t('crm.clients.empty.filterDesc', { filter: filterType })
                    }
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleAddClient}
                      className="inline-flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('crm.clients.addNew')}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredClients.map((client, index) => {
                const isExpanded = expandedClients.has(client.id)
                const contracts = clientContracts[client.id] || []
                const tasks = clientTasks[client.id] || []
                const isLoadingDetails = loadingDetails[client.id]

                return (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <button
                              type="button"
                              onClick={() => toggleClientExpansion(client.id)}
                              className="p-0.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex-shrink-0"
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewClient(client)}
                              className="text-lg font-semibold text-gray-900 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-400 truncate text-left min-w-0"
                            >
                              {client.name}
                            </button>
                            {client.company && (
                              <span className="px-2 py-1 text-xs font-medium bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded-full flex-shrink-0">
                                {client.company}
                              </span>
                            )}
                            {client.isBlocked && (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full flex items-center flex-shrink-0">
                                <Ban className="w-3 h-3 mr-1" />
                                {t('crm.clients.restricted')}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 ml-7">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </div>
                            {client.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 flex-shrink-0" />
                                <span>{client.phone}</span>
                              </div>
                            )}
                          </div>

                          {client.notes && (
                            <p className="mt-2 ml-7 text-sm text-gray-500 dark:text-slate-500 truncate">
                              {client.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <div className="relative block-menu">
                            <button
                              onClick={() => setShowBlockMenu(showBlockMenu === client.id ? null : client.id)}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              title={t('crm.clients.moreOptions')}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {showBlockMenu === client.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => { handleViewClient(client); setShowBlockMenu(null) }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-3" />
                                    {t('crm.clientDetail.details')}
                                  </button>
                                  <button
                                    onClick={() => handleEditClient(client)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                  >
                                    <Edit className="w-4 h-4 mr-3" />
                                    {t('crm.clients.editClient')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPreselectedClient(client)
                                      setIsContractModalOpen(true)
                                      setShowBlockMenu(null)
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                  >
                                    <ContractIcon className="w-4 h-4 mr-3" />
                                    {t('crm.clients.addContract')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPreselectedClient(client)
                                      setIsTaskModalOpen(true)
                                      setShowBlockMenu(null)
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                  >
                                    <CheckSquare className="w-4 h-4 mr-3" />
                                    {t('crm.clients.addTask')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPreselectedClient(client)
                                      setIsDealModalOpen(true)
                                      setShowBlockMenu(null)
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-3" />
                                    {t('crm.clients.addDeal')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPreselectedClient(client)
                                      setIsActivityModalOpen(true)
                                      setShowBlockMenu(null)
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                  >
                                    <Clock className="w-4 h-4 mr-3" />
                                    {t('crm.clients.logActivity')}
                                  </button>
                                  {client.isBlocked ? (
                                    <button
                                      onClick={() => handleUnblockClient(client)}
                                      className="flex items-center w-full px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    >
                                      <Shield className="w-4 h-4 mr-3" />
                                      {t('crm.clients.restoreAccess')}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleBlockClient(client)}
                                      className="flex items-center w-full px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                    >
                                      <Ban className="w-4 h-4 mr-3" />
                                      {t('crm.clients.restrictAccess')}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteClient(client)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-4 h-4 mr-3" />
                                    {t('crm.clients.deleteClient')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                            {isLoadingDetails ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-cyan-600 animate-spin mr-2" />
                                <span className="text-gray-600 dark:text-gray-400">{t('crm.clients.loadingDetails')}</span>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">
                                    {t('crm.clients.additionalInfo')}
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">{t('crm.clients.created')}</span>
                                      <span className="ml-2 text-gray-900 dark:text-slate-100">
                                        {new Date(client.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">{t('crm.clients.lastUpdated')}</span>
                                      <span className="ml-2 text-gray-900 dark:text-slate-100">
                                        {new Date(client.updatedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4">
                                  <button
                                    type="button"
                                    onClick={() => handleViewClientContracts(client)}
                                    className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors underline"
                                  >
                                    <ContractIcon className="w-4 h-4 mr-2" />
                                    {t('crm.clients.contracts', { count: contracts.length })}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleViewClientTasks(client)}
                                    className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors underline"
                                  >
                                    <CheckSquare className="w-4 h-4 mr-2" />
                                    {t('crm.clients.tasks', { count: tasks.length })}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleViewClientLogs(client)}
                                    className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors underline"
                                  >
                                    <Clock className="w-4 h-4 mr-2" />
                                    {t('crm.clients.logs', { count: clientLogsCount[client.id] || 0 })}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleViewClient(client)}
                                    className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 flex items-center hover:underline"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    {t('crm.clientDetail.details')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Client Modal */}
        <ClientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveClient}
          client={selectedClient}
          mode={modalMode}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title={t('crm.clients.delete.title')}
          message={t('crm.clients.delete.message', { name: selectedClient?.name || '' })}
          confirmText={t('common.delete')}
          type="danger"
        />

        {/* Contract Termination Dialog */}
        {isContractTerminationDialogOpen && clientToBlock && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                {t('crm.clients.block.terminateTitle')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('crm.clients.block.terminateMessage', { name: clientToBlock.name, count: activeContractsCount })}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('crm.clients.block.reason')}
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder={t('crm.clients.block.reasonPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsContractTerminationDialogOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleTerminateContractsAndBlock}
                  disabled={!blockReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {t('crm.clients.block.terminateConfirm')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Block Client Dialog */}
        {isBlockDialogOpen && clientToBlock && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                {t('crm.clients.block.restrictTitle')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('crm.clients.block.restrictMessage', { name: clientToBlock.name })}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('crm.clients.block.reason')}
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder={t('crm.clients.block.reasonPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsBlockDialogOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirmBlock}
                  disabled={!blockReason.trim()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {t('crm.clients.restrictAccess')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contract Modal */}
        <ContractModal
          isOpen={isContractModalOpen}
          onClose={() => {
            setIsContractModalOpen(false)
            setPreselectedClient(null)
          }}
          onSave={(contract) => {
            console.log('Contract saved:', contract)
            setIsContractModalOpen(false)
            setPreselectedClient(null)
          }}
          clients={clients as any}
          preselectedClient={preselectedClient as any}
          mode="create"
        />

        {/* Task Modal */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false)
            setPreselectedClient(null)
          }}
          onSave={(task) => {
            console.log('Task saved:', task)
            setIsTaskModalOpen(false)
            setPreselectedClient(null)
          }}
          clients={clients as any}
          preselectedClient={preselectedClient as any}
          mode="create"
        />

        {/* Deal Modal */}
        <DealModal
          isOpen={isDealModalOpen}
          onClose={() => {
            setIsDealModalOpen(false)
            setPreselectedClient(null)
          }}
          onSave={(deal) => {
            console.log('Deal saved:', deal)
            setIsDealModalOpen(false)
            setPreselectedClient(null)
          }}
          clients={clients as any}
          preselectedClient={preselectedClient as any}
        />

        {/* Activity Log Modal */}
        <ActivityLogModal
          isOpen={isActivityModalOpen}
          onClose={() => {
            setIsActivityModalOpen(false)
            setPreselectedClient(null)
          }}
          client={preselectedClient}
          onActivityLogged={() => {
            console.log('Activity logged')
            // Could refresh client data or show notification here
          }}
        />
      </div>
    </RoleGuard>
  )
}