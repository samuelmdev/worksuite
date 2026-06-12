'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, DollarSign, Calendar, FilePlus, UserPlus, CheckSquare, Clock, Activity, User, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import RoleGuard from '../components/RoleGuard'
import ClientModal, { Client } from '../components/ClientModal'
import ContractModal from '../components/ContractModal'
import TaskModal from '../components/TaskModal'
import ActivityLogModal from '../components/ActivityLogModal'
import { useCRM } from '../lib/crm-context'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'
import { TasksService, Task } from '../../lib/tasks-service'
import { activityService } from '../../lib/activity-service'

export default function CRMIndexPage() {
  const router = useRouter()
  const { t, locale } = useLocale()
  const { stats, recentActivities, clients, loading, errors, addClient, refreshAll } = useCRM()
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Activity view state
  const [activeTab, setActiveTab] = useState<'tasks' | 'client-activity' | 'user-activity'>('tasks')
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [clientActivities, setClientActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  // Debug logging
  console.log('CRM Overview: stats:', stats)
  console.log('CRM Overview: loading:', loading)
  console.log('CRM Overview: errors:', errors)
  console.log('CRM Overview: clients count:', clients.length)

  // Refresh data when page becomes visible (fixes back button issue)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && (clients.length === 0 || Object.keys(stats).length === 0)) {
        console.log('CRM Overview: Page became visible, refreshing data...')
        refreshAll().catch(error => {
          console.error('CRM Overview: Error refreshing on visibility change:', error)
        })
      }
    }

    const handleFocus = () => {
      if (clients.length === 0 || Object.keys(stats).length === 0) {
        console.log('CRM Overview: Window focused, refreshing data...')
        refreshAll().catch(error => {
          console.error('CRM Overview: Error refreshing on focus:', error)
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [clients.length, stats, refreshAll])

  // Fetch today's tasks
  const fetchTodayTasks = async () => {
    try {
      setLoadingActivities(true)
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      
      const tasks = await TasksService.getTasks({
        due_date_from: startOfDay.toISOString(),
        due_date_to: endOfDay.toISOString()
      })
      setTodayTasks(tasks)
    } catch (err) {
      console.error('Error fetching today tasks:', err)
    } finally {
      setLoadingActivities(false)
    }
  }

  // Fetch client activities
  const fetchClientActivities = async () => {
    try {
      setLoadingActivities(true)
      const activities = await activityService.getAllClientActivities(20)
      setClientActivities(activities)
    } catch (err) {
      console.error('Error fetching client activities:', err)
    } finally {
      setLoadingActivities(false)
    }
  }

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTodayTasks()
    } else if (activeTab === 'client-activity') {
      fetchClientActivities()
    }
    // user-activity uses the existing recentActivities from context
  }, [activeTab])

  // Handle client save
  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null)
      await addClient(clientData)
      setIsClientModalOpen(false)
    } catch (err) {
      console.error('Error saving client:', err)
      setError(t('crm.error.saveClient'))
    }
  }

  const monthLabel = new Date().toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-US', { month: 'long', year: 'numeric' })

  const statsConfig: {
    titleKey: TranslationKey
    value: string
    change: string
    changeType: 'positive' | 'negative'
    icon: typeof Users
    color: string
    link?: string
    tooltip: string
  }[] = [
    {
      titleKey: 'crm.stats.activeClients',
      value: stats.total_clients?.toString() || '0',
      change: stats.client_change_percentage ? 
        `${stats.client_change_percentage > 0 ? '+' : ''}${stats.client_change_percentage}%` : 
        '0%',
      changeType: (stats.client_change_percentage || 0) >= 0 ? 'positive' : 'negative',
      icon: Users,
      color: 'blue',
      link: '/crm/clients?status=active',
      tooltip: t('crm.stats.tooltip.activeClients', { count: stats.total_clients || 0 })
    },
    {
      titleKey: 'crm.stats.activeContracts',
      value: stats.active_contracts?.toString() || '0',
      change: stats.contract_change_percentage ? 
        `${stats.contract_change_percentage > 0 ? '+' : ''}${stats.contract_change_percentage}%` : 
        '0%',
      changeType: (stats.contract_change_percentage || 0) >= 0 ? 'positive' : 'negative',
      icon: TrendingUp,
      color: 'green',
      link: '/crm/contracts?status=active',
      tooltip: t('crm.stats.tooltip.activeContracts', { count: stats.active_contracts || 0 })
    },
    {
      titleKey: 'crm.stats.pendingTasks',
      value: stats.pending_tasks?.toString() || '0',
      change: stats.tasks_change_percentage ? 
        `${stats.tasks_change_percentage > 0 ? '+' : ''}${stats.tasks_change_percentage}%` : 
        '0%',
      changeType: (stats.tasks_change_percentage || 0) >= 0 ? 'positive' : 'negative',
      icon: CheckSquare,
      color: 'purple',
      link: '/crm/tasks?status=pending',
      tooltip: t('crm.stats.tooltip.pendingTasks', { count: stats.pending_tasks || 0 })
    },
    {
      titleKey: 'crm.stats.monthlyRevenue',
      value: stats.monthly_revenue ? 
        new Intl.NumberFormat(locale === 'fi' ? 'fi-FI' : 'en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(stats.monthly_revenue) : 
        '$0',
      change: stats.revenue_change_percentage ? 
        `${stats.revenue_change_percentage > 0 ? '+' : ''}${stats.revenue_change_percentage}%` : 
        '0%',
      changeType: (stats.revenue_change_percentage || 0) >= 0 ? 'positive' : 'negative',
      icon: DollarSign,
      color: 'violet',
      link: (() => {
        const month = new Date().getMonth()
        const year = new Date().getFullYear()
        return `/crm/reports?section=revenue&period=month&month=${month}&year=${year}`
      })(),
      tooltip: t('crm.stats.tooltip.monthlyRevenue', { month: monthLabel })
    }
  ]

  const activityTabs: { id: 'tasks' | 'client-activity' | 'user-activity'; labelKey: TranslationKey; icon: typeof CheckSquare }[] = [
    { id: 'tasks', labelKey: 'crm.activityDashboard.tasksToday', icon: CheckSquare },
    { id: 'client-activity', labelKey: 'crm.activityDashboard.clientActivity', icon: Users },
    { id: 'user-activity', labelKey: 'crm.activityDashboard.userActivity', icon: Activity },
  ]

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('crm.overview.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('crm.overview.subtitle')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsConfig.map((stat, index) => {
            const Icon = stat.icon
            const cardContent = (
              <motion.div
                key={stat.titleKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 ${
                  stat.link ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                }`}
                title={stat.tooltip}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t(stat.titleKey)}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                      {loading.stats ? '...' : stat.value}
                    </p>
                    <p className={`text-sm mt-1 ${
                      stat.changeType === 'positive' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {stat.change} {t('common.stats.fromLastMonth')}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    stat.color === 'blue' ? 'bg-cyan-200 dark:bg-cyan-900' :
                    stat.color === 'green' ? 'bg-green-200 dark:bg-green-900' :
                    stat.color === 'violet' ? 'bg-violet-200 dark:bg-violet-900' :
                    'bg-orange-200 dark:bg-orange-900'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      stat.color === 'blue' ? 'text-cyan-600 dark:text-cyan-400' :
                      stat.color === 'green' ? 'text-green-600 dark:text-green-400' :
                      stat.color === 'violet' ? 'text-violet-600 dark:text-violet-400' :
                      'text-orange-600 dark:text-orange-400'
                    }`} />
                  </div>
                </div>
              </motion.div>
            )

            // Wrap in Link if it has a link property
            if (stat.link) {
              return (
                <Link key={`link-${stat.titleKey}`} href={stat.link}>
                  {cardContent}
                </Link>
              )
            }

            return cardContent
          })}
        </div>

        {/* Activity Dashboard */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {t('crm.activityDashboard.title')}
              </h2>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mt-4">
              {activityTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t(tab.labelKey)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {loadingActivities ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {t('common.loading')}
              </div>
            ) : (
              <>
                {/* Tasks for Today */}
                {activeTab === 'tasks' && (
                  <>
                    {todayTasks.length === 0 ? (
                      <div className="space-y-4">
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                            {t('crm.tasks.empty.title')}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {t('crm.tasks.empty.desc')}
                          </p>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsTaskModalOpen(true)}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                          >
                            {t('crm.tasks.create')}
                          </motion.button>
                        </div>
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          onClick={() => router.push('/crm/tasks')}
                          className="w-full px-4 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
                        >
                          {t('crm.tasks.viewAll')}
                        </motion.button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {todayTasks.map((task, index) => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                task.status === 'completed' ? 'bg-green-500' :
                                task.status === 'in_progress' ? 'bg-blue-500' :
                                task.priority === 'urgent' ? 'bg-red-500' :
                                task.priority === 'high' ? 'bg-orange-500' : 'bg-gray-400'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                    {task.title}
                                  </p>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    task.is_scheduled 
                                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                  }`}>
                                    {task.is_scheduled ? t('crm.task.scheduled') : t('crm.task.task')}
                                  </span>
                                </div>
                                {task.client_name && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    {t('crm.task.client', { name: task.client_name })}
                                  </p>
                                )}
                                <div className="flex items-center space-x-2">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {task.due_date ? (
                                      task.is_scheduled 
                                        ? new Date(task.due_date).toLocaleString()
                                        : new Date(task.due_date).toLocaleDateString()
                                    ) : t('crm.task.noDueDate')}
                                  </p>
                                  <span className="text-xs text-gray-400">•</span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                    {task.status.replace('_', ' ')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          onClick={() => router.push('/crm/tasks')}
                          className="w-full mt-4 px-4 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
                        >
                          {t('crm.tasks.viewAll')}
                        </motion.button>
                      </div>
                    )}
                  </>
                )}

                {/* Client Activity */}
                {activeTab === 'client-activity' && (
                  <>
                    {loadingActivities ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                      </div>
                    ) : clientActivities.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                          {t('crm.clientActivity.empty.title')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {t('crm.clientActivity.empty.desc')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {clientActivities.slice(0, 5).map((activity, index) => {
                          const client = clients.find(c => c.id === activity.client_id)
                          const getActivityIcon = (type: string) => {
                            switch (type) {
                              case 'call': return '📞'
                              case 'email': return '📧'
                              case 'meeting': return '🤝'
                              case 'note': return '📝'
                              case 'task': return '✅'
                              default: return '📋'
                            }
                          }
                          
                          return (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-start space-x-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                            >
                              <div className="flex-shrink-0 w-8 h-8 bg-cyan-100 dark:bg-cyan-900/20 rounded-full flex items-center justify-center text-lg">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                  {activity.subject}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {client?.name || t('crm.clientActivity.unknownClient')} • {activityService.formatTimeAgo(activity.created_at)}
                                </p>
                                {activity.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                    {activity.description}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          onClick={() => router.push('/crm/logs')}
                          className="w-full mt-4 px-4 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
                        >
                          {t('crm.clientActivity.viewAll')}
                        </motion.button>
                      </div>
                    )}
                  </>
                )}

                {/* User Activity */}
                {activeTab === 'user-activity' && (
                  <>
                    {recentActivities.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                          {t('crm.userActivity.empty.title')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {t('crm.userActivity.empty.desc')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentActivities.slice(0, 8).map((activity, index) => {
                          const getActivityIcon = (action: string) => {
                            switch (action) {
                              case 'created': return '➕'
                              case 'updated': return '✏️'
                              case 'deleted': return '🗑️'
                              case 'approved': return '✅'
                              case 'rejected': return '❌'
                              case 'submitted': return '📤'
                              case 'call_made': return '📞'
                              case 'call_received': return '📞'
                              case 'email_sent': return '📧'
                              case 'email_received': return '📧'
                              case 'meeting_scheduled': return '🤝'
                              case 'meeting_completed': return '🤝'
                              case 'meeting_cancelled': return '❌'
                              case 'proposal_sent': return '📋'
                              case 'contract_signed': return '📝'
                              case 'follow_up_scheduled': return '⏰'
                              default: return '📋'
                            }
                          }
                          
                          const getActivityColor = (action: string) => {
                            switch (action) {
                              case 'created': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
                              case 'updated': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
                              case 'deleted': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
                              case 'approved': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20'
                              case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
                              case 'submitted': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20'
                              case 'call_made':
                              case 'call_received': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
                              case 'email_sent':
                              case 'email_received': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
                              case 'meeting_scheduled':
                              case 'meeting_completed': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20'
                              case 'meeting_cancelled': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
                              case 'proposal_sent': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
                              case 'contract_signed': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20'
                              case 'follow_up_scheduled': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
                              default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
                            }
                          }
                          
                          return (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-start space-x-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                            >
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${getActivityColor(activity.action)}`}>
                                {getActivityIcon(activity.action)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                    {activity.title}
                                  </p>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {activityService.formatTimeAgo(activity.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {activityService.getUserDisplayName(activity.user)} • {activity.module} • {activity.entity_type}
                                </p>
                                {activity.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                    {activity.description}
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          onClick={() => router.push('/crm/settings?section=users')}
                          className="w-full mt-4 px-4 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
                        >
                          {t('crm.userActivity.viewAll')}
                        </motion.button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            {t('common.quickActions')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsClientModalOpen(true)}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <UserPlus className="w-6 h-6 text-cyan-600 dark:text-cyan-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('crm.quickActions.addClient')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('crm.quickActions.addClientDesc')}</p>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsContractModalOpen(true)}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <FilePlus className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('crm.quickActions.addContract')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('crm.quickActions.addContractDesc')}</p>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsTaskModalOpen(true)}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <CheckSquare className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('crm.quickActions.addTask')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('crm.quickActions.addTaskDesc')}</p>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsActivityModalOpen(true)}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus className="w-6 h-6 text-violet-600 dark:text-violet-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('crm.quickActions.addLog')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('crm.quickActions.addLogDesc')}</p>
            </motion.button>
          </div>
        </div>

        {/* Error Display */}
        {(error || errors.stats || errors.activities) && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error || errors.stats || errors.activities}
            </p>
          </div>
        )}

        {/* Client Modal */}
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onSave={handleSaveClient}
          mode="create"
        />

        {/* Contract Modal */}
        <ContractModal
          isOpen={isContractModalOpen}
          onClose={() => setIsContractModalOpen(false)}
          clients={clients}
        />

        {/* Task Modal */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSave={(task) => {
            console.log('Task saved:', task)
            // TODO: Add task to context when we implement task management
          }}
          clients={clients}
        />

        {/* Activity Log Modal */}
        <ActivityLogModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          client={null}
          clients={clients}
          onActivityLogged={() => {
            // Refresh client activities when a new activity is logged
            if (activeTab === 'client-activity') {
              fetchClientActivities()
            }
          }}
        />
      </div>
    </RoleGuard>
  )
}