'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, Building, MapPin, Calendar, FileText, Clock,
  Edit, Trash2, Ban, Globe, Briefcase, CheckSquare, GitBranch, Plus,
  ExternalLink, DollarSign,
} from 'lucide-react'
import RoleGuard from '../../../components/RoleGuard'
import ClientModal, { Client as ModalClient } from '../../../components/ClientModal'
import ClientActivityTimeline from '../../../components/ClientActivityTimeline'
import ActivityLogModal from '../../../components/ActivityLogModal'
import ContractModal from '../../../components/ContractModal'
import TaskModal from '../../../components/TaskModal'
import DealModal from '../../../components/DealModal'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Database } from '../../../../lib/supabase'
import { ClientService } from '../../../../lib/client-service-multi-org'
import { ContractsService } from '../../../../lib/contracts-service-multi-org'
import { TasksService, Task } from '../../../../lib/tasks-service'
import { PipelineService, PipelineItem } from '../../../../lib/pipeline-service-multi-org'
import { activityService } from '../../../../lib/activity-service'
import { useAuth } from '../../../lib/auth-context-multi-org'
import { useCRM } from '../../../lib/crm-context'
import { useLocale } from '../../../lib/locale'
import type { TranslationKey } from '../../../lib/translations'

type DbClient = Database['public']['Tables']['clients']['Row'] & {
  is_blocked?: boolean
  block_reason?: string | null
  blocked_at?: string | null
}
type Contract = Awaited<ReturnType<typeof ContractsService.getContracts>>[number]

type Tab = 'overview' | 'timeline' | 'contracts' | 'tasks' | 'deals'

const tabs: { id: Tab; labelKey: TranslationKey }[] = [
  { id: 'overview', labelKey: 'crm.clientDetail.overview' },
  { id: 'timeline', labelKey: 'crm.clientDetail.timelineTab' },
  { id: 'contracts', labelKey: 'crm.clientDetail.contractsTab' },
  { id: 'tasks', labelKey: 'crm.clientDetail.tasksTab' },
  { id: 'deals', labelKey: 'crm.clientDetail.dealsTab' },
]

function toModalClient(db: DbClient): ModalClient {
  return {
    id: db.id,
    name: db.name,
    email: db.email || '',
    phone: db.phone || '',
    company: db.company || '',
    address: db.address || '',
    notes: db.notes || '',
    isBlocked: db.is_blocked ?? false,
    blockReason: db.block_reason ?? undefined,
    blockedAt: db.blocked_at ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { t, locale } = useLocale()
  const { currentOrganization } = useAuth()
  const { updateClient, deleteClient, clients: crmClients } = useCRM()
  const clientId = params.id as string

  const [client, setClient] = useState<DbClient | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [deals, setDeals] = useState<PipelineItem[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activityStats, setActivityStats] = useState({
    total_interactions: 0,
    calls_made: 0,
    emails_sent: 0,
    meetings_scheduled: 0,
    last_interaction: null as string | null,
  })

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isDealModalOpen, setIsDealModalOpen] = useState(false)

  const loadClientData = useCallback(async () => {
    if (!currentOrganization?.id || !clientId) return

    try {
      setLoading(true)
      setError(null)

      const [clientData, allContracts, clientTasks, allDeals, stats] = await Promise.all([
        ClientService.getClient(clientId, currentOrganization.id),
        ContractsService.getContracts(currentOrganization.id),
        TasksService.getTasks({ client_id: clientId }),
        PipelineService.getPipelineItems(currentOrganization.id),
        activityService.getClientInteractionStats(clientId),
      ])

      if (!clientData) {
        setError(t('crm.clientDetail.notFound'))
        return
      }

      setClient(clientData)
      setContracts(allContracts.filter(c => c.client_id === clientId))
      setTasks(clientTasks)
      setDeals(allDeals.filter(d => d.clientId === clientId))
      setActivityStats(stats)
    } catch (err) {
      console.error('Error loading client:', err)
      setError(t('common.error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [clientId, currentOrganization?.id, t])

  useEffect(() => {
    loadClientData()
  }, [loadClientData])

  const handleUpdateClient = async (updated: Omit<ModalClient, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!client) return
    await updateClient(client.id, updated)
    await loadClientData()
    setIsEditModalOpen(false)
  }

  const handleDeleteClient = async () => {
    if (!client) return
    await deleteClient(client.id)
    router.push('/crm/clients')
  }

  const handleActivityLogged = () => {
    activityService.getClientInteractionStats(clientId).then(setActivityStats)
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })

  const formatCurrency = (value: number, currency = 'EUR') =>
    new Intl.NumberFormat(locale === 'fi' ? 'fi-FI' : 'en-US', {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(value)

  const activeContractValue = contracts
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (c.value || 0), 0)

  const modalClient = client ? toModalClient(client) : null

  if (loading) {
    return (
      <RoleGuard>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
          <p className="text-gray-600 dark:text-slate-400 mt-4">{t('crm.clientDetail.loading')}</p>
        </div>
      </RoleGuard>
    )
  }

  if (error || !client) {
    return (
      <RoleGuard>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">
              {error || t('crm.clientDetail.notFound')}
            </h1>
            <button
              onClick={() => router.push('/crm/clients')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 shape-sm text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('crm.clientDetail.back')}
            </button>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard>
      <div className="max-w-7xl mx-auto w-full flex flex-col h-[calc(100dvh-9rem)] md:h-[calc(100dvh-6rem)] min-h-0">
        {/* Fixed header: back, title, stats, tabs */}
        <div className="flex-shrink-0 space-y-4 pb-4">
        {/* Header */}
        <div>
          <button
            onClick={() => router.push('/crm/clients')}
            className="inline-flex items-center text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('crm.clientDetail.back')}
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-slate-100 truncate">{client.name}</h1>
                {client.company && (
                  <span className="px-3 py-1 text-sm font-medium bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200 rounded-full">
                    {client.company}
                  </span>
                )}
                {client.is_blocked && (
                  <span className="px-3 py-1 text-sm font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 rounded-full flex items-center">
                    <Ban className="w-3 h-3 mr-1" />
                    {t('crm.clients.restricted')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-slate-400">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center hover:text-cyan-600 dark:hover:text-cyan-400">
                    <Mail className="w-4 h-4 mr-1.5" />{client.email}
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center hover:text-cyan-600 dark:hover:text-cyan-400">
                    <Phone className="w-4 h-4 mr-1.5" />{client.phone}
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 shape-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t('crm.timeline.logActivity')}
              </button>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 shape-sm hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <Edit className="w-4 h-4 mr-1.5" />
                {t('crm.clients.editClient')}
              </button>
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-800 shape-sm hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                {t('crm.clients.deleteClient')}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: t('crm.clientDetail.stats.interactions'), value: activityStats.total_interactions, icon: Clock, color: 'text-blue-600 dark:text-blue-400' },
            { label: t('crm.clientDetail.stats.contracts'), value: contracts.length, icon: FileText, color: 'text-green-600 dark:text-green-400' },
            { label: t('crm.clientDetail.stats.tasks'), value: tasks.length, icon: CheckSquare, color: 'text-purple-600 dark:text-purple-400' },
            { label: t('crm.clientDetail.stats.deals'), value: deals.length, icon: GitBranch, color: 'text-orange-600 dark:text-orange-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700 p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
                </div>
                <Icon className={`w-7 h-7 opacity-20 flex-shrink-0 ${color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex space-x-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400 dark:border-cyan-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                {t(tab.labelKey)}
                {tab.id === 'contracts' && contracts.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 rounded-full">{contracts.length}</span>
                )}
                {tab.id === 'tasks' && tasks.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 rounded-full">{tasks.length}</span>
                )}
                {tab.id === 'deals' && deals.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 rounded-full">{deals.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
        </div>

        {/* Scrollable tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-4">
        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Contact info */}
              <div className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">{t('crm.clientDetail.contactInfo')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: Mail, label: t('common.email'), value: client.email, href: client.email ? `mailto:${client.email}` : undefined },
                    { icon: Phone, label: t('common.phone'), value: client.phone, href: client.phone ? `tel:${client.phone}` : undefined },
                    { icon: Building, label: t('common.company'), value: client.company },
                    { icon: Globe, label: t('crm.clientDetail.website'), value: client.website, href: client.website || undefined },
                    { icon: Briefcase, label: t('crm.clientDetail.industry'), value: client.industry },
                    { icon: MapPin, label: t('common.address'), value: client.address, href: client.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}` : undefined, external: true },
                  ].filter(item => item.value).map(({ icon: Icon, label, value, href, external }) => (
                    <div key={label} className="flex items-start space-x-3">
                      <Icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
                        {href ? (
                          <a
                            href={href}
                            target={external ? '_blank' : undefined}
                            rel={external ? 'noopener noreferrer' : undefined}
                            className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            {value}
                          </a>
                        ) : (
                          <p className="text-sm text-gray-900 dark:text-slate-100">{value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {client.notes && (
                <div className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">{t('crm.clientDetail.notes')}</h2>
                  <p className="text-sm text-gray-600 dark:text-slate-400 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}

              {/* Recent timeline preview */}
              <div className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('crm.clientDetail.activity')}</h2>
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    {t('common.viewAll', { item: t('crm.clientDetail.timelineTab') })}
                  </button>
                </div>
                <ClientActivityTimeline
                  clientId={clientId}
                  client={client}
                  showAddButton={false}
                  limit={5}
                  onActivityLogged={handleActivityLogged}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">{t('crm.clientDetail.details')}</h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-slate-400">{t('crm.clients.created')}</dt>
                    <dd className="text-gray-900 dark:text-slate-100">{formatDate(client.created_at)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-slate-400">{t('crm.clients.lastUpdated')}</dt>
                    <dd className="text-gray-900 dark:text-slate-100">{formatDate(client.updated_at)}</dd>
                  </div>
                  {activityStats.last_interaction && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-slate-400">{t('crm.clientDetail.lastInteraction')}</dt>
                      <dd className="text-gray-900 dark:text-slate-100">{activityService.formatTimeAgo(activityStats.last_interaction)}</dd>
                    </div>
                  )}
                  {activeContractValue > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-slate-400">{t('crm.clientDetail.activeValue')}</dt>
                      <dd className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(activeContractValue)}</dd>
                    </div>
                  )}
                  {client.is_blocked && client.block_reason && (
                    <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                      <dt className="text-gray-500 dark:text-slate-400 mb-1">{t('crm.clientDetail.blacklistReason')}</dt>
                      <dd className="text-red-600 dark:text-red-400">{client.block_reason}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">{t('crm.clientDetail.quickActions')}</h2>
                <div className="space-y-2">
                  {[
                    { label: t('crm.clients.addContract'), icon: FileText, action: () => setIsContractModalOpen(true) },
                    { label: t('crm.clients.addTask'), icon: CheckSquare, action: () => setIsTaskModalOpen(true) },
                    { label: t('crm.clients.addDeal'), icon: GitBranch, action: () => setIsDealModalOpen(true) },
                    { label: t('crm.timeline.logActivity'), icon: Clock, action: () => setIsActivityModalOpen(true) },
                  ].map(({ label, icon: Icon, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 shape-sm transition-colors"
                    >
                      <Icon className="w-4 h-4 mr-3 text-gray-400" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interaction breakdown */}
              <div className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">{t('crm.clientDetail.stats.interactions')}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t('modal.activity.type.call'), value: activityStats.calls_made, color: 'text-green-600' },
                    { label: t('modal.activity.type.email'), value: activityStats.emails_sent, color: 'text-blue-600' },
                    { label: t('modal.activity.type.meeting'), value: activityStats.meetings_scheduled, color: 'text-purple-600' },
                    { label: t('crm.clientDetail.stats.interactions'), value: activityStats.total_interactions, color: 'text-cyan-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 shape-sm">
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700 p-6">
            <ClientActivityTimeline
              clientId={clientId}
              client={client}
              showAddButton={true}
              limit={100}
              onActivityLogged={handleActivityLogged}
            />
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {t('crm.clientDetail.contractsTab')} ({contracts.length})
              </h2>
              <button
                onClick={() => setIsContractModalOpen(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 shape-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t('crm.clients.addContract')}
              </button>
            </div>
            {contracts.length === 0 ? (
              <p className="p-6 text-gray-500 dark:text-slate-400">{t('crm.clientDetail.noContracts')}</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {contracts.map(contract => (
                  <div key={contract.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{contract.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {contract.type} · {formatDate(contract.start_date)}
                        {contract.end_date && ` – ${formatDate(contract.end_date)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        contract.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {contract.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100 flex items-center">
                        <DollarSign className="w-4 h-4 mr-0.5" />
                        {formatCurrency(contract.value, contract.currency)}
                      </span>
                      <button
                        onClick={() => router.push(`/crm/contracts?client=${encodeURIComponent(client.name)}`)}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {t('crm.clientDetail.tasksTab')} ({tasks.length})
              </h2>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 shape-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t('crm.clients.addTask')}
              </button>
            </div>
            {tasks.length === 0 ? (
              <p className="p-6 text-gray-500 dark:text-slate-400">{t('crm.clientDetail.noTasks')}</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{task.title}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {task.task_type}
                        {task.due_date && ` · ${formatDate(task.due_date)}`}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="bg-white dark:bg-slate-800 shape border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {t('crm.clientDetail.dealsTab')} ({deals.length})
              </h2>
              <button
                onClick={() => setIsDealModalOpen(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 shape-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                {t('crm.clients.addDeal')}
              </button>
            </div>
            {deals.length === 0 ? (
              <p className="p-6 text-gray-500 dark:text-slate-400">{t('crm.clientDetail.noDeals')}</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {deals.map(deal => (
                  <div key={deal.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{deal.title}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 capitalize">{deal.stage?.replace('-', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {deal.value != null && (
                        <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {formatCurrency(deal.value)}
                        </span>
                      )}
                      <button
                        onClick={() => router.push('/crm/pipeline')}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Modals */}
      {modalClient && (
        <>
          <ClientModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleUpdateClient}
            client={modalClient}
            mode="edit"
          />
          <ActivityLogModal
            isOpen={isActivityModalOpen}
            onClose={() => setIsActivityModalOpen(false)}
            client={client}
            onActivityLogged={() => { handleActivityLogged(); loadClientData() }}
          />
          <ContractModal
            isOpen={isContractModalOpen}
            onClose={() => { setIsContractModalOpen(false); loadClientData() }}
            onSave={() => { setIsContractModalOpen(false); loadClientData() }}
            clients={[client]}
            preselectedClient={client}
            mode="create"
          />
          <TaskModal
            isOpen={isTaskModalOpen}
            onClose={() => { setIsTaskModalOpen(false); loadClientData() }}
            onSave={() => { setIsTaskModalOpen(false); loadClientData() }}
            clients={[client]}
            preselectedClient={client}
            mode="create"
          />
          <DealModal
            isOpen={isDealModalOpen}
            onClose={() => { setIsDealModalOpen(false); loadClientData() }}
            onSave={() => { setIsDealModalOpen(false); loadClientData() }}
            clients={crmClients as any}
            preselectedClient={modalClient}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteClient}
        title={t('crm.clients.delete.title')}
        message={t('crm.clients.delete.message', { name: client.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
      />
    </RoleGuard>
  )
}
