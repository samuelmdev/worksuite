'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Clock, ChevronLeft, ChevronRight, Plus, User, Building } from 'lucide-react'
import { TimeService, TimeEntry } from '@/lib/time-service-multi-org'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

interface WeeklyCalendarViewProps {
  timeSlots: Array<{
    date: string
    timeEntries: TimeEntry[]
    totalHours: number
  }>
  currentWeek: string
  onPreviousWeek: () => void
  onNextWeek: () => void
  onCurrentWeek: () => void
  onAddTimeEntry?: (date: string) => void
  onEditTimeEntry?: (timeEntry: TimeEntry) => void
  getUserName: (userId: string) => string
  getClientName: (clientId: string | null) => string
  getStatusColor: (status: string) => string
  getStatusBorderColor: (status: string) => string
  userRole?: string
}

export default function WeeklyCalendarView({
  timeSlots,
  currentWeek,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
  onAddTimeEntry,
  onEditTimeEntry,
  getUserName,
  getClientName,
  getStatusColor,
  getStatusBorderColor,
  userRole
}: WeeklyCalendarViewProps) {
  const { t, locale } = useLocale()
  const weekDayKeys: TranslationKey[] = [
    'enum.weekday.monday', 'enum.weekday.tuesday', 'enum.weekday.wednesday',
    'enum.weekday.thursday', 'enum.weekday.friday', 'enum.weekday.saturday', 'enum.weekday.sunday',
  ]
  
  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const dateLocale = locale === 'fi' ? 'fi-FI' : 'en-US'
    
    const startStr = start.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
    const endStr = end.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })
    
    return `${startStr} - ${endStr}`
  }

  const getTotalWeekHours = () => {
    return timeSlots.reduce((total, slot) => total + slot.totalHours, 0)
  }

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  const isPastDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr < today
  }

  return (
    <div className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700">
      {/* Calendar Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('time.calendar.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('time.calendar.weekSummary', { range: formatWeekRange(currentWeek), hours: getTotalWeekHours().toFixed(1) })}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onPreviousWeek}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={onCurrentWeek}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
            >
              {t('time.calendar.today')}
            </button>
            
            <button
              onClick={onNextWeek}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        <div className="grid grid-cols-7 gap-4">
          {timeSlots.map((slot, index) => (
            <motion.div
              key={slot.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`min-h-[200px] shape-sm border-2 transition-all duration-200 ${
                isToday(slot.date)
                  ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : isPastDate(slot.date)
                  ? 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700'
                  : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800'
              }`}
            >
              {/* Day Header */}
              <div className="p-3 border-b border-gray-200 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {t(weekDayKeys[index])}
                    </p>
                    <p className={`text-xs ${
                      isToday(slot.date)
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {TimeService.formatDate(slot.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {slot.totalHours.toFixed(1)}h
                    </p>
                    {onAddTimeEntry && (
                      <button
                        onClick={() => onAddTimeEntry(slot.date)}
                        className="mt-1 p-1 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        title={t('time.calendar.addEntry')}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Entries */}
              <div className="p-3 space-y-2">
                {slot.timeEntries.length === 0 ? (
                  <div className="text-center py-4">
                    <Clock className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('time.calendar.noEntries')}</p>
                  </div>
                ) : (
                  slot.timeEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-2 shape-sm cursor-pointer transition-all duration-200 hover:shadow-md ${getStatusBorderColor(entry.status)} ${
                        getStatusColor(entry.status)
                      }`}
                      onClick={() => onEditTimeEntry?.(entry)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-medium text-gray-900 dark:text-slate-100 truncate">
                          {entry.project_name}
                        </p>
                        <span className={`px-1 py-0.5 text-xs rounded ${getStatusColor(entry.status)}`}>
                          {TimeService.formatTimeEntry(entry)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {entry.description}
                      </p>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Building className="w-3 h-3" />
                          <span className="truncate">{getClientName(entry.client_id)}</span>
                        </div>
                      </div>
                      
                      {(userRole === 'admin' || userRole === 'manager') && (
                        <div className="flex items-center space-x-1 mt-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {getUserName(entry.user_id)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Week Summary */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-700 shape-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  {t('time.calendar.totalWeekHours')}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('time.calendar.entriesCount', { count: timeSlots.reduce((total, slot) => total + slot.timeEntries.length, 0) })}
              </div>
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {t('time.calendar.hours', { hours: getTotalWeekHours().toFixed(1) })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
