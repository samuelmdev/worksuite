'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, Edit, Trash2, DollarSign, Calendar, User, Building, Filter, Loader2, TrendingUp, Target, Clock, MoreVertical, Archive, Ban } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import DealModal from '../../components/DealModal'
import TaskModal from '../../components/TaskModal'
import ContractModal from '../../components/ContractModal'
import { ClientService } from '../../../lib/client-service-multi-org'
import { PipelineService, PipelineItem } from '../../../lib/pipeline-service-multi-org'
import { CompensationService } from '../../../lib/compensation-service'
import { useAuth } from '../../lib/auth-context-multi-org'
import { Database } from '../../../lib/supabase'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

type Client = Database['public']['Tables']['clients']['Row']

const stages: { key: string; labelKey: TranslationKey; color: string; textColor: string }[] = [
  { key: 'lead', labelKey: 'enum.pipelineStage.lead', color: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-700 dark:text-gray-300' },
  { key: 'qualified', labelKey: 'enum.pipelineStage.qualified', color: 'bg-blue-100 dark:bg-blue-900', textColor: 'text-blue-700 dark:text-blue-300' },
  { key: 'proposal', labelKey: 'enum.pipelineStage.proposal', color: 'bg-yellow-100 dark:bg-yellow-900', textColor: 'text-yellow-700 dark:text-yellow-300' },
  { key: 'negotiation', labelKey: 'enum.pipelineStage.negotiation', color: 'bg-orange-100 dark:bg-orange-900', textColor: 'text-orange-700 dark:text-orange-300' },
  { key: 'closed-won', labelKey: 'enum.pipelineStage.closedWon', color: 'bg-green-100 dark:bg-green-900', textColor: 'text-green-700 dark:text-green-300' },
  { key: 'closed-lost', labelKey: 'enum.pipelineStage.closedLost', color: 'bg-red-100 dark:bg-red-900', textColor: 'text-red-700 dark:text-red-300' }
]

export default function CRMPipelinePage() {
  const searchParams = useSearchParams()
  const { t } = useLocale()
  const { currentOrganization, user } = useAuth()
  const [commissionNotice, setCommissionNotice] = useState<string | null>(null)
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<PipelineItem | null>(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<PipelineItem | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<PipelineItem | null>(null)
  const [preselectedClient, setPreselectedClient] = useState<Client | null>(null)
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
  const [itemToBlock, setItemToBlock] = useState<PipelineItem | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskModalClient, setTaskModalClient] = useState<Client | null>(null)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [contractModalClient, setContractModalClient] = useState<Client | null>(null)
  const [contractModalPipelineItem, setContractModalPipelineItem] = useState<PipelineItem | null>(null)
  const [isMobileView, setIsMobileView] = useState(false)
  const [movingItemId, setMovingItemId] = useState<string | null>(null)
  const stageColumnRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobileView(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const clientParam = searchParams.get('client')
    const actionParam = searchParams.get('action')
    
    if (clientParam) {
      setSearchTerm(decodeURIComponent(clientParam))
    }
    
    if (actionParam === 'create') {
      setShowItemModal(true)
    }
  }, [searchParams])

  // Fetch pipeline items and clients from database
  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrganization?.id) {
        setPipelineItems([])
        setClients([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const fetchPromise = Promise.all([
          PipelineService.getPipelineItems(currentOrganization.id),
          ClientService.getClients(currentOrganization.id),
        ])

        const [pipelineItemsData, clientsData] = await Promise.race([
          fetchPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Data fetch timeout')), 10000)
          ),
        ])
        
        setPipelineItems(pipelineItemsData)
        setClients(clientsData)
        
        // Find preselected client if client parameter exists
        const clientParam = searchParams.get('client')
        if (clientParam) {
          const clientName = decodeURIComponent(clientParam)
          const foundClient = clientsData.find(client => 
            client.name.toLowerCase() === clientName.toLowerCase()
          )
          if (foundClient) {
            setPreselectedClient(foundClient)
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        // Don't show error for timeout, just log it and continue with empty data
        if (err instanceof Error && err.message.includes('timeout')) {
          console.warn('Data fetch timed out, continuing with empty data')
          setPipelineItems([])
          setClients([])
        } else {
          setError(t('crm.pipelinePage.error.load'))
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [searchParams, currentOrganization?.id])

  // Filter pipeline items based on search term, stage, and archive status
  const filteredPipelineItems = pipelineItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clientCompany.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStage = filterStage === 'all' || item.stage === filterStage
    
    const matchesArchive = showArchived ? true : !item.isArchived
    
    return matchesSearch && matchesStage && matchesArchive
  })

  // Group pipeline items by stage
  const itemsByStage = stages.reduce((acc, stage) => {
    acc[stage.key] = filteredPipelineItems.filter(item => item.stage === stage.key)
    return acc
  }, {} as Record<string, PipelineItem[]>)

  // Calculate pipeline metrics (exclude archived items when not showing archived)
  const activePipelineItems = pipelineItems.filter(item => !item.isArchived)
  const totalValue = activePipelineItems.reduce((sum, item) => sum + item.value, 0)
  const weightedValue = activePipelineItems.reduce((sum, item) => sum + (item.value * item.probability / 100), 0)
  const wonItems = activePipelineItems.filter(item => item.stage === 'closed-won')
  const wonValue = wonItems.reduce((sum, item) => sum + item.value, 0)

  const openContractModalForItem = (item: PipelineItem) => {
    let client: Client | undefined

    if (item.type === 'deal' && item.clientId) {
      client = clients.find((c) => c.id === item.clientId)
    } else {
      client = clients.find(
        (c) =>
          c.name === item.clientName ||
          c.email === item.clientEmail ||
          c.company === item.clientCompany
      )
    }

    if (client) {
      setContractModalClient(client)
      setContractModalPipelineItem(item)
      setIsContractModalOpen(true)
    } else {
      alert(
        `Client not found for contract creation. Pipeline item type: ${item.type}, Client ID: ${item.clientId}, Client Name: ${item.clientName}. Please ensure the client exists in the CRM.`
      )
    }
  }

  const moveItemToStage = async (itemId: string, targetStage: string) => {
    const item = pipelineItems.find((pipelineItem) => pipelineItem.id === itemId)
    if (!item || !currentOrganization?.id || item.stage === targetStage) return

    const previousItems = pipelineItems
    const optimisticItem: PipelineItem = {
      ...item,
      stage: targetStage as PipelineItem['stage'],
      probability: targetStage === 'closed-won' ? 100 : targetStage === 'closed-lost' ? 0 : item.probability,
      isBlocked: targetStage === 'closed-lost' ? true : item.isBlocked,
      blockReason:
        targetStage === 'closed-lost'
          ? 'Automatically blocked when moved to closed-lost'
          : item.blockReason,
      updatedAt: new Date().toISOString(),
    }

    setPipelineItems((prev) =>
      prev.map((pipelineItem) => (pipelineItem.id === itemId ? optimisticItem : pipelineItem))
    )
    setMovingItemId(itemId)
    setError(null)

    try {
      const updateData: {
        stage: PipelineItem['stage']
        isBlocked?: boolean
        blockReason?: string
        probability?: number
      } = {
        stage: targetStage as PipelineItem['stage'],
      }

      if (targetStage === 'closed-lost') {
        updateData.isBlocked = true
        updateData.blockReason = 'Automatically blocked when moved to closed-lost'
        updateData.probability = 0
      } else if (targetStage === 'closed-won') {
        updateData.probability = 100
      }

      const updatedItem = await PipelineService.updatePipelineItem(
        item.id,
        updateData,
        currentOrganization.id
      )

      setPipelineItems((prev) =>
        prev.map((pipelineItem) => (pipelineItem.id === item.id ? updatedItem : pipelineItem))
      )

      if (isMobileView) {
        requestAnimationFrame(() => {
          stageColumnRefs.current[targetStage]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      }

      if (targetStage === 'closed-won') {
        // Record the rep's commission before opening the contract flow. This is
        // idempotent per deal, so bouncing a deal in and out of closed-won
        // cannot pay twice.
        if (user?.id && currentOrganization.role) {
          try {
            const commission = await CompensationService.recordCommissionForWonDeal({
              organizationId: currentOrganization.id,
              pipelineItemId: updatedItem.id,
              userId: user.id,
              role: currentOrganization.role,
              dealValue: updatedItem.value,
              clientId: updatedItem.clientId ?? null,
            })
            if (commission) {
              setCommissionNotice(
                t('crm.pipelinePage.commissionRecorded', {
                  amount: commission.amount.toLocaleString(undefined, {
                    style: 'currency',
                    currency: commission.currency,
                  }),
                })
              )
            }
          } catch (commissionError) {
            // A commission failure must not roll back a won deal.
            console.error('Error recording commission:', commissionError)
          }
        }

        openContractModalForItem(updatedItem)
      }
    } catch (error) {
      console.error('Error updating pipeline item stage:', error)
      setPipelineItems(previousItems)
      setError('Failed to update pipeline item. Please try again.')
    } finally {
      setMovingItemId(null)
    }
  }

  const handleMobileStageChange = (itemId: string, targetStage: string) => {
    void moveItemToStage(itemId, targetStage)
  }

  const handleArchiveItem = async (itemId: string) => {
    if (!currentOrganization?.id) return
    try {
      await PipelineService.archivePipelineItem(itemId, currentOrganization.id)
      
      // Update local state
      setPipelineItems(prev => prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          isArchived: true, 
          archivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        } : item
      ))
      
      console.log(`Pipeline item "${itemId}" archived successfully`)
    } catch (error) {
      console.error('Error archiving pipeline item:', error)
      setError('Failed to archive pipeline item')
    }
  }

  const handleUnarchiveItem = async (itemId: string) => {
    if (!currentOrganization?.id) return
    try {
      await PipelineService.unarchivePipelineItem(itemId, currentOrganization.id)
      
      // Update local state
      setPipelineItems(prev => prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          isArchived: false, 
          archivedAt: undefined,
          updatedAt: new Date().toISOString() 
        } : item
      ))
      
      console.log(`Pipeline item "${itemId}" unarchived successfully`)
    } catch (error) {
      console.error('Error unarchiving pipeline item:', error)
      setError('Failed to unarchive pipeline item')
    }
  }

  const handleBlockItem = async (itemId: string, reason: string) => {
    if (!currentOrganization?.id) return
    try {
      await PipelineService.blockPipelineItem(itemId, reason, currentOrganization.id)
      // Refresh pipeline items from database
      const updatedItems = await PipelineService.getPipelineItems(currentOrganization.id)
      setPipelineItems(updatedItems)
    } catch (error) {
      console.error('Error blocking pipeline item:', error)
      setError('Failed to block pipeline item. Please try again.')
    }
  }

  const handleUnblockItem = async (itemId: string) => {
    if (!currentOrganization?.id) return
    try {
      await PipelineService.unblockPipelineItem(itemId, currentOrganization.id)
      // Refresh pipeline items from database
      const updatedItems = await PipelineService.getPipelineItems(currentOrganization.id)
      setPipelineItems(updatedItems)
    } catch (error) {
      console.error('Error unblocking pipeline item:', error)
      setError('Failed to unblock pipeline item. Please try again.')
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: PipelineItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()

    if (draggedItem && draggedItem.stage !== targetStage) {
      await moveItemToStage(draggedItem.id, targetStage)
    }

    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  // Modal handlers
  const handleAddDeal = () => {
    setEditingItem(null)
    setPreselectedClient(null)
    setShowItemModal(true)
  }

  const handleEditItem = (item: PipelineItem) => {
    setEditingItem(item)
    setShowItemModal(true)
  }

  const handleDeleteItem = (item: PipelineItem) => {
    setItemToDelete(item)
    setIsDeleteDialogOpen(true)
  }

  const handleBlockItemClick = (item: PipelineItem) => {
    setItemToBlock(item)
    setBlockReason('')
    setIsBlockDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!currentOrganization?.id) return
    if (itemToDelete) {
      try {
        await PipelineService.deletePipelineItem(itemToDelete.id, currentOrganization.id)
        // Refresh pipeline items from database
        const updatedItems = await PipelineService.getPipelineItems(currentOrganization.id)
        setPipelineItems(updatedItems)
        setIsDeleteDialogOpen(false)
        setItemToDelete(null)
      } catch (error) {
        console.error('Error deleting pipeline item:', error)
        setError('Failed to delete pipeline item. Please try again.')
      }
    }
  }

  const handleConfirmBlock = () => {
    if (itemToBlock && blockReason.trim()) {
      handleBlockItem(itemToBlock.id, blockReason.trim())
      setIsBlockDialogOpen(false)
      setItemToBlock(null)
      setBlockReason('')
    }
  }

  const handleSaveDeal = async (dealData: any) => {
    if (!currentOrganization?.id) {
      setError('No organization selected')
      return
    }

    try {
      if (editingItem) {
        // Update existing item
        const updatedItem = await PipelineService.updatePipelineItem(editingItem.id, dealData, currentOrganization.id)
        setPipelineItems(prev => prev.map(item => 
          item.id === editingItem.id ? updatedItem : item
        ))
      } else {
        // Create new item
        // If this is a lead (new client), create the client in the CRM first
        if (dealData.type === 'lead') {
          try {
            const newClient = await ClientService.createClient({
              name: dealData.clientName,
              email: dealData.clientEmail,
              phone: dealData.clientPhone || '',
              company: dealData.clientCompany,
              address: '',
              notes: `Created from pipeline lead: ${dealData.title}`,
              status: 'lead',
              organization_id: currentOrganization.id,
            })

            dealData.clientId = newClient.id

            const updatedClients = await ClientService.getClients(currentOrganization.id)
            setClients(updatedClients)
          } catch (error) {
            console.error('Error creating client from pipeline lead:', error)
          }
        }
        
        // Create the pipeline item in the database
        const newItem = await PipelineService.createPipelineItem({
          ...dealData,
          clientId: dealData.clientId || undefined,
          organization_id: currentOrganization.id,
        })
        setPipelineItems(prev => [newItem, ...prev])
      }
      
      // Close modal and reset editing state
      setShowItemModal(false)
      setEditingItem(null)
      setPreselectedClient(null)
    } catch (error) {
      console.error('Error saving pipeline item:', error)
      setError('Failed to save pipeline item. Please try again.')
    }
  }

  const handleAddTask = (item: PipelineItem) => {
    // Find the client for this pipeline item
    let client: Client | undefined
    
    if (item.type === 'deal' && item.clientId) {
      // For deals, use the clientId to find the client
      client = clients.find(c => c.id === item.clientId)
    } else {
      // For leads, try to match by name/email/company
      client = clients.find(c => 
        c.name === item.clientName || 
        c.email === item.clientEmail ||
        c.company === item.clientCompany
      )
    }
    
    if (client) {
      setTaskModalClient(client)
      setIsTaskModalOpen(true)
    } else {
      // If client doesn't exist, we might need to create it first
      // For now, show an alert with more details
      console.log('Pipeline item:', item)
      console.log('Available clients:', clients)
      alert(`Client not found. Pipeline item type: ${item.type}, Client ID: ${item.clientId}, Client Name: ${item.clientName}. Please ensure the client exists in the CRM.`)
    }
  }

  const handleTaskSaved = (task: any) => {
    // Task was saved successfully
    console.log('Task saved:', task)
    // Close the task modal
    setIsTaskModalOpen(false)
    setTaskModalClient(null)
    // You could add a toast notification here
  }

  const handleContractSaved = async (contract: any) => {
    const pipelineItemToArchive = contractModalPipelineItem
    const orgId = currentOrganization?.id

    setIsContractModalOpen(false)
    setContractModalClient(null)
    setContractModalPipelineItem(null)

    if (contract.client_id && orgId && contract.status === 'active') {
      try {
        const client = clients.find((c) => c.id === contract.client_id)
        if (client && client.status !== 'active') {
          await ClientService.updateClient(contract.client_id, { status: 'active' }, orgId)
          const updatedClients = await ClientService.getClients(orgId)
          setClients(updatedClients)
        }
      } catch (error) {
        console.warn('Could not update client status after contract creation:', error)
      }
    }

    if (pipelineItemToArchive && orgId) {
      try {
        await PipelineService.updatePipelineItem(
          pipelineItemToArchive.id,
          {
            ...pipelineItemToArchive,
            isArchived: true,
            archivedAt: new Date().toISOString(),
          },
          orgId
        )

        const updatedItems = await PipelineService.getPipelineItems(orgId)
        setPipelineItems(updatedItems)
      } catch (error) {
        console.error('Error archiving pipeline item:', error)
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('crm.pipelinePage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('crm.pipelinePage.subtitle')}
            </p>
            {error && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shape-sm">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            {commissionNotice && (
              <div className="mt-2 flex items-center justify-between gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 shape-sm">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">{commissionNotice}</p>
                <button
                  onClick={() => setCommissionNotice(null)}
                  className="text-emerald-600 dark:text-emerald-400 hover:opacity-70 text-sm"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center px-4 py-2 shape-sm transition-colors ${
                showArchived 
                  ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showArchived ? t('crm.pipelinePage.hideArchived') : t('crm.pipelinePage.showArchived')}
            </button>
            <button 
              onClick={handleAddDeal}
              className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white shape-sm transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('crm.pipelinePage.add')}
            </button>
          </div>
        </div>

        {/* Pipeline Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pipeline</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(totalValue)}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 shape-sm">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Weighted Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(weightedValue)}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 shape-sm">
                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Won Deals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(wonValue)}</p>
              </div>
              <div className="p-3 bg-violet-100 dark:bg-violet-900 shape-sm">
                <DollarSign className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{activePipelineItems.length}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900 shape-sm">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('crm.pipelinePage.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 appearance-none bg-white dark:bg-slate-700"
            >
              <option value="all">{t('crm.pipelinePage.filter.allStages')}</option>
              {stages.map(stage => (
                <option key={stage.key} value={stage.key}>{t(stage.labelKey)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pipeline Board */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('crm.pipelinePage.loading')}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
            {stages.map((stage, stageIndex) => (
              <motion.div
                key={stage.key}
                ref={(element) => {
                  stageColumnRefs.current[stage.key] = element
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: stageIndex * 0.1 }}
                className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700"
              >
                {/* Stage Header */}
                <div className={`p-4 shape-tab ${stage.color}`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${stage.textColor}`}>{t(stage.labelKey)}</h3>
                    <span className={`text-sm ${stage.textColor}`}>
                      {itemsByStage[stage.key]?.length || 0}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${stage.textColor}`}>
                    {formatCurrency(itemsByStage[stage.key]?.reduce((sum, item) => sum + item.value, 0) || 0)}
                  </p>
                </div>

                {/* Pipeline Items in Stage */}
                <div 
                  className="p-4 space-y-3 min-h-[200px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.key)}
                >
                  {itemsByStage[stage.key]?.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {stage.key === 'lead' ? t('crm.pipelinePage.add') : t('crm.pipelinePage.empty.title')}
                      </p>
                      {stage.key === 'lead' && (
                        <button 
                          onClick={handleAddDeal}
                          className="mt-2 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          {t('crm.pipelinePage.add')}
                        </button>
                      )}
                    </div>
                  ) : (
                  itemsByStage[stage.key]?.map((item, itemIndex) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: itemIndex * 0.05 }}
                    >
                      <div
                        draggable={!isMobileView}
                        onDragStart={(e: React.DragEvent) => handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 shape-sm border hover:shadow-md transition-all ${
                          isMobileView ? 'cursor-pointer' : 'cursor-move'
                        } ${
                          draggedItem?.id === item.id 
                            ? 'opacity-50 scale-95' 
                            : item.isBlocked 
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 opacity-75'
                              : item.isArchived 
                                ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60'
                                : item.type === 'deal' 
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300' 
                                  : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:border-gray-300'
                        }`}
                        onClick={isMobileView ? undefined : () => handleEditItem(item)}
                      >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          {isMobileView ? (
                            <button
                              type="button"
                              onClick={() => handleEditItem(item)}
                              className="text-left font-medium text-gray-900 dark:text-slate-100 text-sm hover:text-cyan-600 dark:hover:text-cyan-400"
                            >
                              {item.title}
                            </button>
                          ) : (
                            <h4 className="font-medium text-gray-900 dark:text-slate-100 text-sm">
                              {item.title}
                            </h4>
                          )}
                          <div className="flex items-center gap-1">
                            {item.isBlocked && (
                              <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300">
                                Blocked
                              </span>
                            )}
                            {item.isArchived && !item.isBlocked && (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                Archived
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              item.type === 'deal' 
                                ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300' 
                                : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                            }`}>
                              {item.type === 'deal' ? 'Deal' : 'Lead'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                          <Building className="w-3 h-3" />
                          <span>{item.clientCompany}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                            {formatCurrency(item.value)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.probability}%
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(item.expectedCloseDate)}</span>
                        </div>
                        
                        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              item.isBlocked 
                                ? 'bg-red-600' 
                                : item.type === 'deal' 
                                  ? 'bg-green-600' 
                                  : 'bg-cyan-600'
                            }`}
                            style={{ width: `${item.probability}%` }}
                          />
                        </div>

                        {/* Mobile stage mover */}
                        <div
                          className="lg:hidden pt-2 border-t border-gray-200 dark:border-gray-600"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                        >
                          <label
                            htmlFor={`pipeline-stage-${item.id}`}
                            className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            {t('crm.pipelinePage.moveToStage')}
                          </label>
                          <select
                            id={`pipeline-stage-${item.id}`}
                            value={item.stage}
                            disabled={movingItemId === item.id}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleMobileStageChange(item.id, e.target.value)
                            }}
                            className="w-full shape-sm border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          >
                            {stages.map((stage) => (
                              <option key={stage.key} value={stage.key}>
                                {t(stage.labelKey)}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Action buttons */}
                        <div
                          className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-600"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {isMobileView && (
                            <button
                              type="button"
                              onClick={() => handleEditItem(item)}
                              className="text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300 rounded hover:bg-cyan-200 dark:hover:bg-cyan-700 transition-colors flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              {t('common.edit')}
                            </button>
                          )}
                          {!item.isArchived && !item.isBlocked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleArchiveItem(item.id)
                              }}
                              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                            >
                              <Archive className="w-3 h-3" />
                              {t('crm.pipelinePage.actions.archive')}
                            </button>
                          )}
                          {item.isArchived && !item.isBlocked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUnarchiveItem(item.id)
                              }}
                              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                            >
                              Unarchive
                            </button>
                          )}
                          {item.isBlocked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUnblockItem(item.id)
                              }}
                              className="text-xs px-2 py-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
                            >
                              Unblock
                            </button>
                          )}
                          {!item.isBlocked && item.stage === 'closed-lost' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleBlockItemClick(item)
                              }}
                              className="text-xs px-2 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                              <Ban className="w-3 h-3" />
                              {t('crm.pipelinePage.actions.block')}
                            </button>
                          )}
                          {!item.isArchived && !item.isBlocked && ['lead', 'qualified', 'proposal', 'negotiation'].includes(item.stage) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddTask(item)
                              }}
                              className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-700 transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              {t('crm.pipelinePage.actions.createTask')}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteItem(item)
                            }}
                            className="text-xs px-2 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                      </div>
                    </motion.div>
                  ))
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Deal Modal */}
        <DealModal
          isOpen={showItemModal}
          onClose={() => {
            setShowItemModal(false)
            setEditingItem(null)
            setPreselectedClient(null)
          }}
          onSave={handleSaveDeal}
          clients={clients}
          preselectedClient={preselectedClient}
          deal={editingItem}
          mode={editingItem ? 'edit' : 'create'}
        />

        {/* Task Modal */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false)
            setTaskModalClient(null)
          }}
          onSave={handleTaskSaved}
          clients={clients}
          preselectedClient={taskModalClient || undefined}
          mode="create"
        />

        {/* Contract Modal */}
        <ContractModal
          isOpen={isContractModalOpen}
          onClose={() => {
            setIsContractModalOpen(false)
            setContractModalClient(null)
            setContractModalPipelineItem(null)
          }}
          onSave={handleContractSaved}
          clients={clients}
          preselectedClient={contractModalClient || undefined}
          pipelineItem={contractModalPipelineItem || undefined}
          mode="create"
        />

        {/* Delete Confirmation Dialog */}
        {isDeleteDialogOpen && itemToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 shape-sm p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                {t('crm.pipelinePage.delete.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('crm.pipelinePage.delete.message', { title: itemToDelete.title })}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white shape-sm transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Block Confirmation Dialog */}
        {isBlockDialogOpen && itemToBlock && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 shape-sm p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                {t('crm.pipelinePage.block.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('crm.pipelinePage.block.reason')}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('crm.pipelinePage.block.reason')}
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder={t('crm.pipelinePage.block.reasonPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
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
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white shape-sm transition-colors"
                >
                  {t('crm.pipelinePage.actions.block')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
