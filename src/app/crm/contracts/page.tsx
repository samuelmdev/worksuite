'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, Trash2, DollarSign, Calendar, Building, Filter, Loader2, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import ContractModal from '../../components/ContractModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useCRM } from '../../lib/crm-context'
import { ContractsService, Contract } from '../../../lib/contracts-service-multi-org'
import { useAuth } from '../../lib/auth-context-multi-org'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

const contractStatuses: { value: string; labelKey: TranslationKey }[] = [
  { value: 'active', labelKey: 'crm.contractsPage.status.active' },
  { value: 'pending', labelKey: 'crm.contractsPage.status.pending' },
  { value: 'expired', labelKey: 'crm.contractsPage.status.expired' },
  { value: 'cancelled', labelKey: 'crm.contractsPage.status.terminated' },
]

const contractTypes: { value: string; labelKey: TranslationKey }[] = [
  { value: 'monthly', labelKey: 'enum.contractType.monthly' },
  { value: 'yearly', labelKey: 'enum.contractType.yearly' },
  { value: 'one_time', labelKey: 'enum.contractType.oneTime' },
  { value: 'hourly', labelKey: 'enum.contractType.hourly' },
  { value: 'project', labelKey: 'enum.contractType.project' },
]

const getStatusLabelKey = (status: string): TranslationKey => {
  const map: Record<string, TranslationKey> = {
    active: 'crm.contractsPage.status.active',
    pending: 'crm.contractsPage.status.pending',
    expired: 'crm.contractsPage.status.expired',
    cancelled: 'crm.contractsPage.status.terminated',
    terminated: 'crm.contractsPage.status.terminated',
    draft: 'crm.contractsPage.status.draft',
  }
  return map[status] ?? 'crm.contractsPage.status.pending'
}

const getTypeLabelKey = (type: string): TranslationKey => {
  const map: Record<string, TranslationKey> = {
    monthly: 'enum.contractType.monthly',
    yearly: 'enum.contractType.yearly',
    one_time: 'enum.contractType.oneTime',
    hourly: 'enum.contractType.hourly',
    project: 'enum.contractType.project',
  }
  return map[type] ?? 'enum.contractType.project'
}

export default function CRMContractsPage() {
  const searchParams = useSearchParams()
  const { t } = useLocale()
  const { clients } = useCRM()
  const { currentOrganization } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Load contracts on component mount and when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      loadContracts()
    } else {
      setContracts([])
      setFilteredContracts([])
    }
  }, [currentOrganization?.id])

  // Handle URL parameters
  useEffect(() => {
    const clientParam = searchParams.get('client')
    const statusParam = searchParams.get('status')
    
    if (clientParam) {
      setSearchTerm(decodeURIComponent(clientParam))
    }
    
    if (statusParam) {
      setFilterStatus(statusParam)
    }
  }, [searchParams])

  // Filter contracts based on search term and filters
  useEffect(() => {
    let filtered = contracts

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(contract =>
        contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(contract => contract.status === filterStatus)
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(contract => contract.type === filterType)
    }

    setFilteredContracts(filtered)
  }, [searchTerm, filterStatus, filterType, contracts])

  const loadContracts = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true)
        setError(null)
      }
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      )
      
      if (!currentOrganization?.id) {
        console.log('Contracts page: No organization selected, skipping contract fetch')
        return
      }
      
      console.log('Contracts page: Fetching contracts for organization:', currentOrganization.id)
      
      const data = await Promise.race([
        ContractsService.getContracts(currentOrganization.id),
        timeoutPromise
      ]) as Contract[]
      
      console.log('Contracts page: Fetched contracts:', data)
      setContracts(data)
      setRetryCount(0) // Reset retry count on success
    } catch (err) {
      console.error('Error loading contracts:', err)
      if (err instanceof Error && err.message.includes('timeout')) {
        setError(t('common.error.timeout'))
      } else {
        setError(t('crm.contractsPage.error.load'))
      }
      
      // Auto-retry once after a delay
      if (retryCount === 0) {
        setRetryCount(1)
        setTimeout(() => loadContracts(true), 2000)
        return
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddContract = () => {
    setSelectedContract(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract)
    setModalMode('view')
    setIsModalOpen(true)
  }

  const handleSaveContract = async (contract: any) => {
    try {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected')
      }
      
      if (selectedContract) {
        await ContractsService.updateContract(selectedContract.id, contract, currentOrganization.id)
      } else {
        await ContractsService.createContract({ ...contract, organization_id: currentOrganization.id })
      }
      await loadContracts()
      setIsModalOpen(false)
      setSelectedContract(null)
    } catch (error) {
      console.error('Error saving contract:', error)
    }
  }

  const handleDeleteContract = (contract: Contract) => {
    setSelectedContract(contract)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (selectedContract) {
      try {
        setError(null)
        if (!currentOrganization?.id) {
          throw new Error('No organization selected')
        }
        await ContractsService.deleteContract(selectedContract.id, currentOrganization.id)
        await loadContracts() // Reload contracts
        setIsDeleteDialogOpen(false)
        setSelectedContract(null)
      } catch (err) {
        console.error('Error deleting contract:', err)
        setError(t('common.error.deleteFailed'))
      }
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedContract(null)
    setModalMode('create')
    loadContracts()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
      case 'expired':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
      case 'cancelled':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('crm.contractsPage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('crm.contractsPage.subtitle')}
            </p>
            {error && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
                <button
                  onClick={() => loadContracts()}
                  disabled={loading}
                  className="text-xs px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('common.retrying') : t('common.retry')}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleAddContract}
            className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('crm.contractsPage.add')}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('crm.contractsPage.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 appearance-none bg-white dark:bg-slate-700"
            >
              <option value="all">{t('crm.contractsPage.filter.allStatus')}</option>
              {contractStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {t(status.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-3 pr-8 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 appearance-none bg-white dark:bg-slate-700"
            >
              <option value="all">{t('crm.contractsPage.filter.allTypes')}</option>
              {contractTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {t(type.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {filteredContracts.length} of {contracts.length} contracts
            {searchTerm && ` matching "${searchTerm}"`}
            {(filterStatus !== 'all' || filterType !== 'all') && ` (filters applied)`}
          </span>
        </div>

        {/* Contracts List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('crm.contractsPage.loading')}</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                  ? t('crm.contractsPage.empty.filtered')
                  : t('crm.contractsPage.empty.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                  ? t('crm.contractsPage.empty.filtered')
                  : t('crm.contractsPage.empty.desc')}
              </p>
              {!searchTerm && filterStatus === 'all' && filterType === 'all' && (
                <button
                  onClick={handleAddContract}
                  className="inline-flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('crm.contractsPage.add')}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredContracts.map((contract, index) => (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleViewContract(contract)}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                          {contract.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${getStatusColor(contract.status)}`}>
                          {getStatusIcon(contract.status)}
                          <span>{t(getStatusLabelKey(contract.status))}</span>
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full">
                          {t(getTypeLabelKey(contract.type))}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4" />
                          <span>{contract.clients?.name || t('crm.contractsPage.noClient')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium text-gray-900 dark:text-slate-100">
                            {formatCurrency(contract.monthly_value || contract.value || 0)}
                            {contract.type === 'monthly' && contract.monthly_value && ' /month'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Start: {formatDate(contract.start_date)}</span>
                        </div>
                        {contract.end_date && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>End: {formatDate(contract.end_date)}</span>
                          </div>
                        )}
                      </div>
                      
                      {contract.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 p-3 rounded-lg">
                          {contract.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewContract(contract)}
                        className="p-2 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                        title={t('common.view')}
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContract(contract)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Contract Modal */}
        <ContractModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleSaveContract}
          clients={clients as any}
          contract={selectedContract}
          mode={modalMode}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title={t('crm.contractsPage.delete.title')}
          message={t('crm.contractsPage.delete.message', { name: selectedContract?.name ?? '' })}
          confirmText={t('common.delete')}
          type="danger"
        />
      </div>
    </RoleGuard>
  )
}
