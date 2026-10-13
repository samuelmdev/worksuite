'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, TrendingUp, Calendar, CheckCircle, AlertCircle, XCircle, Plus } from 'lucide-react'
import RoleGuard from '../components/RoleGuard'
import { useTime } from '../lib/time-context'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'
import TimeEntryModal from '../components/TimeEntryModal'
import { TimeService } from '../../lib/time-service-multi-org'

export default function TimeIndex() {
  const { user, currentOrganization } = useAuth()
  const { t } = useLocale()
  const { stats, timeEntries, loading, loadingStats, clients, users, createTimeEntry } = useTime()
  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false)

  const handleTimeEntrySaved = () => {
    // Time entries will be refreshed automatically by the context
  }

  // Helper functions to get user and client names
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.id : userId
  }

  const getClientName = (clientId: string | null) => {
    if (!clientId) return t('time.entry.noClient')
    const client = clients.find(c => c.id === clientId)
    return client ? client.name || client.email || clientId : clientId
  }

  const getStatsConfig = (): { titleKey: TranslationKey; value: string; icon: typeof Clock; color: string }[] => {
    if (currentOrganization?.role === 'employee') {
      return [
        {
          titleKey: 'time.stats.myHoursWeek',
          value: stats.total_hours_this_week?.toFixed(1) || '0.0',
          icon: Clock,
          color: 'emerald'
        },
        {
          titleKey: 'time.stats.myEntriesWeek',
          value: stats.total_entries_this_week?.toString() || '0',
          icon: CheckCircle,
          color: 'violet'
        },
        {
          titleKey: 'time.stats.submittedReview',
          value: stats.pending_approvals?.toString() || '0',
          icon: AlertCircle,
          color: 'orange'
        },
        {
          titleKey: 'time.stats.approvedEntries',
          value: stats.approved_entries?.toString() || '0',
          icon: CheckCircle,
          color: 'green'
        }
      ]
    }
    return [
      {
        titleKey: 'time.stats.totalHoursWeek',
        value: stats.total_hours_this_week?.toFixed(1) || '0.0',
        icon: Clock,
        color: 'emerald'
      },
      {
        titleKey: 'time.stats.billableHours',
        value: stats.billable_hours?.toFixed(1) || '0.0',
        icon: TrendingUp,
        color: 'emerald'
      },
      {
        titleKey: 'time.stats.totalEntries',
        value: stats.total_entries_this_week?.toString() || '0',
        icon: CheckCircle,
        color: 'violet'
      },
      {
        titleKey: 'time.stats.submittedReview',
        value: stats.pending_approvals?.toString() || '0',
        icon: AlertCircle,
        color: 'orange'
      }
    ]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'submitted':
        return <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      case 'draft':
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
      case 'submitted':
        return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'
      case 'draft':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      case 'rejected':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'border-2 border-emerald-200 dark:border-emerald-800 border-l-4 border-l-emerald-500 dark:border-l-emerald-400'
      case 'submitted':
        return 'border-2 border-yellow-200 dark:border-yellow-800 border-l-4 border-l-yellow-500 dark:border-l-yellow-400'
      case 'rejected':
        return 'border-2 border-red-200 dark:border-red-800 border-l-4 border-l-red-500 dark:border-l-red-400'
      case 'draft':
        return 'border-2 border-blue-200 dark:border-blue-800 border-l-4 border-l-blue-500 dark:border-l-blue-400'
      default:
        return 'border-2 border-gray-200 dark:border-gray-700 border-l-4 border-l-gray-400 dark:border-l-gray-500'
    }
  }

  return (
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('time.overview.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {currentOrganization?.role === 'employee' 
                ? t('time.overview.subtitleEmployee')
                : t('time.overview.subtitleManager')
              }
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsTimeEntryModalOpen(true)}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shape-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('time.overview.addEntry')}
          </motion.button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getStatsConfig().map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.titleKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t(stat.titleKey)}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                      {loadingStats ? '...' : stat.value}
                    </p>
                  </div>
                  <div className={`p-3 shape-sm ${
                    stat.color === 'cyan' ? 'bg-cyan-200 dark:bg-cyan-900' :
                    stat.color === 'emerald' ? 'bg-emerald-200 dark:bg-emerald-900' :
                    stat.color === 'green' ? 'bg-green-200 dark:bg-green-900' :
                    stat.color === 'violet' ? 'bg-violet-200 dark:bg-violet-900' :
                    'bg-orange-200 dark:bg-orange-900'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      stat.color === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' :
                      stat.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                      stat.color === 'green' ? 'text-green-600 dark:text-green-400' :
                      stat.color === 'violet' ? 'text-violet-600 dark:text-violet-400' :
                      'text-orange-600 dark:text-orange-400'
                    }`} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Recent Time Entries */}
        <div className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('time.recent.title')}
            </h2>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/time-tracking/hours'}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
            >
              {t('time.recent.viewAll')}
            </motion.button>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {t('time.recent.loading')}
              </div>
            ) : timeEntries.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                  {t('time.recent.empty.title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t('time.recent.empty.desc')}
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsTimeEntryModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shape-sm transition-colors"
                >
                  {t('time.overview.addEntry')}
                </motion.button>
              </div>
            ) : (
              timeEntries.slice(0, 5).map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${getStatusBorderColor(entry.status)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Primary Information - Employee and Client */}
                      <div className="flex items-center space-x-3 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {getUserName(entry.user_id)}
                        </p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {getClientName(entry.client_id)}
                        </p>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(entry.status)}`}>
                          {entry.status}
                        </span>
                      </div>
                      
                      {/* Secondary Information - Project and Description */}
                      {entry.project_name && (
                        <p className="text-sm text-gray-700 dark:text-slate-300 mb-1">
                          {t('time.entry.project', { name: entry.project_name })}
                        </p>
                      )}
                      
                      {entry.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {entry.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {TimeService.formatDate(entry.start_time)}
                        </p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {TimeService.formatTimeEntry(entry)}
                        </p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(entry.billable_hours || 0) > 0 ? t('time.entry.billable') : t('time.entry.nonBillable')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(entry.status)}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            {t('common.quickActions')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsTimeEntryModalOpen(true)}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 shape-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('time.quickActions.addEntry')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('time.quickActions.addEntryDesc')}</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 shape-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('time.quickActions.calendar')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('time.quickActions.calendarDesc')}</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 shape-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <TrendingUp className="w-6 h-6 text-violet-600 dark:text-violet-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('time.quickActions.reports')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('time.quickActions.reportsDesc')}</p>
            </motion.button>
          </div>
        </div>

        {/* Time Entry Modal */}
        <TimeEntryModal
          isOpen={isTimeEntryModalOpen}
          onClose={() => setIsTimeEntryModalOpen(false)}
          mode="create"
          clients={clients}
          users={currentOrganization?.role === 'admin' || currentOrganization?.role === 'manager' ? users : undefined}
          currentUser={user || undefined}
          onTimeEntrySaved={handleTimeEntrySaved}
        />
      </div>
    </RoleGuard>
  )
}