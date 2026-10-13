'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Clock, 
  Filter, 
  Search, 
  Plus, 
  Calendar, 
  User, 
  Building, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  ChevronDown,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useTime } from '../../lib/time-context'
import { useAuth } from '../../lib/auth-context-multi-org'
import TimeEntryModal from '../../components/TimeEntryModal'
import WeeklyCalendarView from '../../components/WeeklyCalendarView'
import { TimeService } from '../../../lib/time-service-multi-org'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

export default function TimeHoursPage() {
  const { t } = useLocale()
  const { user, currentOrganization } = useAuth()
  // Roles are per-organization in the multi-org model, not per-user.
  const role = currentOrganization?.role
  const {
    timeEntries, 
    weeklyTimeSlots,
    loading, 
    users, 
    clients, 
    filters, 
    setFilters, 
    clearFilters,
    currentWeek,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    approveTimeEntry,
    rejectTimeEntry
  } = useTime()

  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false)
  const [editingTimeEntry, setEditingTimeEntry] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedDate, setSelectedDate] = useState<string>('')

  const handleTimeEntrySaved = () => {
    // Time entries will be refreshed automatically by the context
    setEditingTimeEntry(null)
    setSelectedDate('')
  }

  const handleAddTimeEntryForDate = (date: string) => {
    setSelectedDate(date)
    setEditingTimeEntry(null)
    setIsTimeEntryModalOpen(true)
  }

  const handleEditTimeEntry = (timeEntry: any) => {
    setEditingTimeEntry(timeEntry)
    setIsTimeEntryModalOpen(true)
  }

  const getTimeStatusLabel = (status: string) => {
    const map: Record<string, TranslationKey> = {
      draft: 'enum.timeStatus.draft',
      submitted: 'enum.timeStatus.submitted',
      approved: 'enum.timeStatus.approved',
      rejected: 'enum.timeStatus.rejected',
    }
    return t(map[status] ?? 'enum.timeStatus.draft')
  }

  const handleDeleteTimeEntry = async (id: string) => {
    if (window.confirm(t('common.deleteConfirm'))) {
      try {
        await deleteTimeEntry(id)
      } catch (error) {
        console.error('Error deleting time entry:', error)
      }
    }
  }

  const handleApproveTimeEntry = async (id: string) => {
    if (role !== 'admin' && role !== 'manager') {
      alert('You do not have permission to approve time entries')
      return
    }

    try {
      await approveTimeEntry(id)
    } catch (error) {
      console.error('Error approving time entry:', error)
    }
  }

  const handleRejectTimeEntry = async (id: string) => {
    if (role !== 'admin' && role !== 'manager') {
      alert('You do not have permission to reject time entries')
      return
    }

    const reason = prompt(t('time.hoursPage.rejectPrompt'))
    if (reason) {
      try {
        await rejectTimeEntry(id, reason)
      } catch (error) {
        console.error('Error rejecting time entry:', error)
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'submitted':
        return <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      case 'draft':
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
      case 'rejected':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'draft':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
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

  const getUserName = (userId: string) => {
    const userData = users.find(u => u.id === userId)
    return userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.id : userId
  }

  const getClientName = (clientId: string | null) => {
    if (!clientId) return t('time.hoursPage.noClient')
    const client = clients.find(c => c.id === clientId)
    return client?.name || clientId
  }

  // Filter time entries based on search term
  const filteredTimeEntries = timeEntries.filter(entry => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      (entry.project_name || '').toLowerCase().includes(searchLower) ||
      entry.description.toLowerCase().includes(searchLower) ||
      getUserName(entry.user_id).toLowerCase().includes(searchLower) ||
      getClientName(entry.client_id).toLowerCase().includes(searchLower)
    )
  })

  return (
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('time.hoursPage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {role === 'employee' 
                ? t('time.hoursPage.subtitleEmployee')
                : t('time.hoursPage.subtitleManager')
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-700 shape-sm p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm font-medium shape-sm transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-slate-100'
                }`}
              >
                {t('common.list')}
              </button>
          <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 text-sm font-medium shape-sm transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-slate-100'
                }`}
              >
                {t('common.calendar')}
              </button>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setEditingTimeEntry(null)
                setSelectedDate('')
                setIsTimeEntryModalOpen(true)
              }}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shape-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
              {t('time.hoursPage.add')}
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('common.filters')}</h2>
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
                    placeholder={t('time.hoursPage.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1 border border-gray-300 dark:border-slate-600 shape-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>
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

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {/* User Filter - only for admin/manager */}
                {(role === 'admin' || role === 'manager') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      {t('common.employee')}
                    </label>
                    <select
                      value={filters.user_id || ''}
                      onChange={(e) => setFilters({ ...filters, user_id: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">{t('common.allEmployees')}</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    {t('common.status')}
                  </label>
          <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">{t('time.hoursPage.filter.allStatus')}</option>
            <option value="draft">{t('enum.timeStatus.draft')}</option>
            <option value="submitted">{t('enum.timeStatus.submitted')}</option>
            <option value="approved">{t('enum.timeStatus.approved')}</option>
            <option value="rejected">{t('enum.timeStatus.rejected')}</option>
          </select>
        </div>

                {/* Client Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    <Building className="w-4 h-4 inline mr-1" />
                    {t('common.client')}
                  </label>
                  <select
                    value={filters.client_id || ''}
                    onChange={(e) => setFilters({ ...filters, client_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">{t('common.all')}</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Clear Filters */}
            {(filters.user_id || filters.status || filters.client_id) && (
              <div className="mt-4">
                <button
                  onClick={clearFilters}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'list' ? (
          /* Time Entries List */
        <div className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('time.hoursPage.title')} ({filteredTimeEntries.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-2">{t('time.hoursPage.loading')}</p>
            </div>
          ) : filteredTimeEntries.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {t('time.hoursPage.empty.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || filters.user_id || filters.status || filters.client_id
                  ? t('time.hoursPage.empty.filtered')
                  : t('time.hoursPage.empty.desc')
                }
              </p>
              {!searchTerm && !filters.user_id && !filters.status && !filters.client_id && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setEditingTimeEntry(null)
                    setIsTimeEntryModalOpen(true)
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shape-sm transition-colors"
                >
                  {t('time.hoursPage.add')}
                </motion.button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredTimeEntries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                    className={`p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${getStatusBorderColor(entry.status)}`}
                  >
                    <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 shape-sm flex items-center justify-center">
                        <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Primary Information - Employee and Client */}
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-medium text-gray-900 dark:text-slate-100">
                              {getUserName(entry.user_id)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-gray-900 dark:text-slate-100">
                              {getClientName(entry.client_id)}
                            </span>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(entry.status)}`}>
                            {getTimeStatusLabel(entry.status)}
                          </span>
                          {(entry.billable_hours || 0) > 0 && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                              {t('time.entry.billable')}
                            </span>
                          )}
                        </div>
                        
                        {/* Secondary Information - Project and Description */}
                        {entry.project_name && (
                          <div className="mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              {t('time.entry.project', { name: entry.project_name })}
                            </span>
                          </div>
                        )}
                        
                        {entry.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {entry.description}
                        </p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{TimeService.formatDate(entry.start_time)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{TimeService.formatTimeEntry(entry)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(entry.status)}
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEditTimeEntry(entry)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title={t('time.hoursPage.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        {role === 'admin' || role === 'manager' ? (
                          <>
                            {entry.status === 'submitted' && (
                              <>
                                <button
                                  onClick={() => handleApproveTimeEntry(entry.id)}
                                  className="p-2 text-green-400 hover:text-green-600 transition-colors"
                                  title={t('time.hoursPage.approve')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectTimeEntry(entry.id)}
                                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                  title={t('time.hoursPage.reject')}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                        <button
                            onClick={() => handleDeleteTimeEntry(entry.id)}
                            className="p-2 text-red-400 hover:text-red-600 transition-colors"
                            title={t('time.hoursPage.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        )}
                      </div>
                      </div>
                    </div>
                  </motion.div>
              ))}
            </div>
          )}
        </div>
        ) : (
          /* Calendar View */
          <WeeklyCalendarView
            timeSlots={weeklyTimeSlots}
            currentWeek={currentWeek}
            onPreviousWeek={goToPreviousWeek}
            onNextWeek={goToNextWeek}
            onCurrentWeek={goToCurrentWeek}
            onAddTimeEntry={handleAddTimeEntryForDate}
            onEditTimeEntry={handleEditTimeEntry}
            getUserName={getUserName}
            getClientName={getClientName}
            getStatusColor={getStatusColor}
            getStatusBorderColor={getStatusBorderColor}
            userRole={role}
          />
        )}

        {/* Time Entry Modal */}
        <TimeEntryModal
          isOpen={isTimeEntryModalOpen}
          onClose={() => {
            setIsTimeEntryModalOpen(false)
            setEditingTimeEntry(null)
            setSelectedDate('')
          }}
          timeEntry={editingTimeEntry}
          mode={editingTimeEntry ? 'edit' : 'create'}
          clients={clients}
          users={role === 'admin' || role === 'manager' ? users : undefined}
          currentUser={user || undefined}
          onTimeEntrySaved={handleTimeEntrySaved}
          preselectedDate={selectedDate}
        />
      </div>
    </RoleGuard>
  )
}