'use client'

import { useState, useEffect } from 'react'
import { X, Clock, User, Building, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { TimeService, TimeEntryFormData } from '@/lib/time-service-multi-org'
import { Database } from '@/lib/supabase'
import { User as AuthUser, useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

type Client = Database['public']['Tables']['clients']['Row']
type User = Database['public']['Tables']['users']['Row']

const timeStatusKeys: Record<string, TranslationKey> = {
  draft: 'enum.timeStatus.draft',
  submitted: 'enum.timeStatus.submitted',
  approved: 'enum.timeStatus.approved',
  rejected: 'enum.timeStatus.rejected',
}

interface TimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  timeEntry?: any // TimeEntry | null
  mode: 'create' | 'edit'
  clients: Client[]
  users?: User[]
  currentUser?: AuthUser
  onTimeEntrySaved?: () => void
  preselectedDate?: string
}

export default function TimeEntryModal({ 
  isOpen, 
  onClose, 
  timeEntry, 
  mode, 
  clients, 
  users = [], 
  currentUser,
  onTimeEntrySaved,
  preselectedDate
}: TimeEntryModalProps) {
  const { currentOrganization } = useAuth()
  const { t } = useLocale()
  
  const [formData, setFormData] = useState<TimeEntryFormData>({
    user_id: currentUser?.id || '',
    organization_id: currentOrganization?.id || '',
    client_id: null,
    project_name: '',
    description: '',
    start_time: '',
    end_time: '',
    billable_hours: 0,
    status: 'submitted'
  })

  // Separate state for date and time inputs
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('07:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('07:00')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update organization_id when currentOrganization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      setFormData(prev => ({
        ...prev,
        organization_id: currentOrganization.id
      }))
    }
  }, [currentOrganization?.id])

  // Reset form when modal opens/closes or timeEntry changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && timeEntry) {
        const startDateTime = new Date(timeEntry.start_time)
        const endDateTime = new Date(timeEntry.end_time)
        
        setFormData({
          user_id: timeEntry.user_id || currentUser?.id || '',
          organization_id: timeEntry.organization_id || currentOrganization?.id || '',
          client_id: timeEntry.client_id,
          project_name: timeEntry.project_name || '',
          description: timeEntry.description || '',
          start_time: timeEntry.start_time || '',
          end_time: timeEntry.end_time || '',
          billable_hours: timeEntry.billable_hours || 0,
          status: timeEntry.status || 'submitted'
        })
        
        setStartDate(startDateTime.toISOString().split('T')[0])
        setStartTime(startDateTime.toTimeString().slice(0, 5))
        setEndDate(endDateTime.toISOString().split('T')[0])
        setEndTime(endDateTime.toTimeString().slice(0, 5))
      } else {
        const selectedDate = preselectedDate || new Date().toISOString().split('T')[0]
        
        setFormData({
          user_id: currentUser?.id || '',
          organization_id: currentOrganization?.id || '',
          client_id: null,
          project_name: '',
          description: '',
          start_time: `${selectedDate}T07:00:00`,
          end_time: `${selectedDate}T07:00:00`,
          billable_hours: 0,
          status: 'submitted'
        })
        
        setStartDate(selectedDate)
        setStartTime('07:00')
        setEndDate(selectedDate)
        setEndTime('07:00')
      }
      setError(null)
    }
  }, [isOpen, timeEntry, mode, currentUser, preselectedDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.organization_id) {
      setError(t('modal.timeEntry.error.noOrg'))
      return
    }
    
    if (!formData.user_id) {
      setError(t('modal.timeEntry.error.userRequired'))
      return
    }

    if (!formData.client_id) {
      setError(t('modal.timeEntry.error.clientRequired'))
      return
    }

    if (!formData.description?.trim()) {
      setError(t('modal.timeEntry.error.descriptionRequired'))
      return
    }

    if (!formData.start_time) {
      setError(t('modal.timeEntry.error.startRequired'))
      return
    }

    if (!formData.end_time) {
      setError(t('modal.timeEntry.error.endRequired'))
      return
    }

    if (billableHours <= 0) {
      setError(t('modal.timeEntry.error.endAfterStart'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (mode === 'edit' && timeEntry) {
        await TimeService.updateTimeEntry(timeEntry.id, formData, formData.organization_id)
      } else {
        await TimeService.createTimeEntry(formData)
      }
      
      onTimeEntrySaved?.()
      onClose()
    } catch (err) {
      console.error('Error saving time entry:', err)
      setError(t('modal.timeEntry.error.saveFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof TimeEntryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle start date change - automatically update end date
  const handleStartDateChange = (date: string) => {
    setStartDate(date)
    setEndDate(date) // End date follows start date
    updateFormData()
  }

  // Handle start time change
  const handleStartTimeChange = (time: string) => {
    setStartTime(time)
    updateFormData()
  }

  // Handle end date change
  const handleEndDateChange = (date: string) => {
    setEndDate(date)
    updateFormData()
  }

  // Handle end time change
  const handleEndTimeChange = (time: string) => {
    setEndTime(time)
    updateFormData()
  }

  // Update form data with current date/time values
  const updateFormData = () => {
    if (startDate && startTime && endDate && endTime) {
      const startDateTime = `${startDate}T${startTime}:00`
      const endDateTime = `${endDate}T${endTime}:00`
      
      setFormData(prev => ({
        ...prev,
        start_time: startDateTime,
        end_time: endDateTime,
        billable_hours: calculateBillableHours()
      }))
    }
  }

  // Update form data when date/time states change
  useEffect(() => {
    updateFormData()
  }, [startDate, startTime, endDate, endTime])

  // Calculate billable hours from start and end times
  const calculateBillableHours = () => {
    if (startDate && startTime && endDate && endTime) {
      const startDateTime = new Date(`${startDate}T${startTime}:00`)
      const endDateTime = new Date(`${endDate}T${endTime}:00`)
      
      if (endDateTime > startDateTime) {
        const diffInMs = endDateTime.getTime() - startDateTime.getTime()
        const diffInHours = diffInMs / (1000 * 60 * 60)
        return Math.round(diffInHours * 100) / 100 // Round to 2 decimal places
      }
    }
    return 0
  }

  const billableHours = calculateBillableHours()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100 truncate">
              {mode === 'edit' ? t('modal.timeEntry.editTitle') : t('modal.timeEntry.createTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              {mode === 'edit' ? t('modal.timeEntry.editSubtitle') : t('modal.timeEntry.createSubtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-2"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* User Selection - only show for admin/manager */}
          {users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                {t('common.employee')} *
              </label>
              <select
                value={formData.user_id}
                onChange={(e) => handleInputChange('user_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                <option value="">{t('common.selectEmployee')}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              {t('common.client')} *
            </label>
            <select
              value={formData.client_id || ''}
              onChange={(e) => handleInputChange('client_id', e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">{t('common.selectClient')}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              {t('modal.timeEntry.projectName')}
            </label>
            <input
              type="text"
              value={formData.project_name || ''}
              onChange={(e) => handleInputChange('project_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder={t('modal.timeEntry.placeholder.project')}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              {t('common.description')} *
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder={t('modal.timeEntry.placeholder.description')}
              rows={3}
              required
            />
          </div>

          {/* Start Date and Time */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('modal.timeEntry.startTime')}</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('common.date')} *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('common.time')} *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* End Date and Time */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('modal.timeEntry.endTime')}</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('common.date')} *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('common.time')} *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Calculated Billable Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              {t('modal.timeEntry.billableHours')}
            </label>
            <div className={`w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-slate-100 ${
              billableHours > 0 
                ? 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600' 
                : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {billableHours > 0 
                    ? t('modal.timeEntry.billableHoursLabel', { hours: billableHours.toFixed(2) })
                    : t('modal.timeEntry.invalidTimes')
                  }
                </span>
                <span className={`text-lg font-semibold ${
                  billableHours > 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {billableHours > 0 ? t('common.hoursUnit', { count: billableHours.toFixed(2) }) : t('common.hoursUnit', { count: '0.00' })}
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          {(currentOrganization?.role === 'admin' || currentOrganization?.role === 'manager') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('common.status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {Object.entries(timeStatusKeys).map(([value, key]) => (
                  <option key={value} value={value}>{t(key)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-3 sm:py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {mode === 'edit' ? t('modal.timeEntry.updateButton') : t('modal.timeEntry.addButton')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}