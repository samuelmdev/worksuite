'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, User, Phone, Mail, Calendar, FileText, CheckCircle, AlertCircle, Plus, MoreHorizontal } from 'lucide-react'
import { activityService, ClientActivityTimeline as ActivityTimeline } from '@/lib/activity-service'
import ActivityLogModal from './ActivityLogModal'
import { Database } from '@/lib/supabase'
import { useLocale } from '../lib/locale'

type Client = Database['public']['Tables']['clients']['Row']

interface ClientActivityTimelineProps {
  clientId: string
  client?: Client
  showAddButton?: boolean
  limit?: number
  onActivityLogged?: () => void
}

export default function ClientActivityTimeline({ 
  clientId, 
  client, 
  showAddButton = true, 
  limit = 50,
  onActivityLogged
}: ClientActivityTimelineProps) {
  const { t, locale } = useLocale()
  const [activities, setActivities] = useState<ActivityTimeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await activityService.getAllClientActivities(clientId, limit)
      setActivities(data)
    } catch (err) {
      console.error('Error loading client activities:', err)
      setError(t('crm.timeline.error.load'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clientId) {
      loadActivities()
    }
  }, [clientId, limit])

  const handleActivityLogged = () => {
    loadActivities() // Refresh the timeline
    onActivityLogged?.() // Call parent callback
  }

  const getActivityIcon = (action: string, entityType: string) => {
    switch (action) {
      case 'call':
      case 'call_made':
      case 'call_received':
        return <Phone className="w-4 h-4" />
      case 'email':
      case 'email_sent':
      case 'email_received':
        return <Mail className="w-4 h-4" />
      case 'meeting':
      case 'meeting_scheduled':
      case 'meeting_completed':
        return <Calendar className="w-4 h-4" />
      case 'meeting_cancelled':
        return <AlertCircle className="w-4 h-4" />
      case 'note':
        return <FileText className="w-4 h-4" />
      case 'task':
      case 'proposal_sent':
        return <FileText className="w-4 h-4" />
      case 'contract_signed':
        return <CheckCircle className="w-4 h-4" />
      case 'follow_up':
      case 'follow_up_scheduled':
        return <Clock className="w-4 h-4" />
      case 'created':
        return entityType === 'client' ? <User className="w-4 h-4" /> : <Plus className="w-4 h-4" />
      case 'updated':
        return <MoreHorizontal className="w-4 h-4" />
      case 'deleted':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getActivityColor = (action: string) => {
    return activityService.getInteractionColor(action)
  }

  const formatTimeAgo = (dateString: string) => {
    return activityService.formatTimeAgo(dateString)
  }

  const groupActivitiesByDate = (activities: ActivityTimeline[]) => {
    const groups: { [key: string]: ActivityTimeline[] } = {}
    
    activities.forEach(activity => {
      const date = new Date(activity.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
    })
    
    return groups
  }

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return t('crm.timeline.today')
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('crm.timeline.yesterday')
    } else {
      return date.toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadActivities}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
        >
          {t('crm.timeline.tryAgain')}
        </button>
      </div>
    )
  }

  const groupedActivities = groupActivitiesByDate(activities)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('crm.timeline.title')}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {activities.length === 1
              ? t('crm.timeline.activityCountOne', { count: activities.length })
              : t('crm.timeline.activityCount', { count: activities.length })}
          </p>
        </div>
        {showAddButton && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('crm.timeline.logActivity')}
          </button>
        )}
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">{t('crm.timeline.empty.title')}</h4>
          <p className="text-gray-500 dark:text-slate-400 mb-4">
            {t('crm.timeline.empty.desc')}
          </p>
          {showAddButton && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t('crm.timeline.logFirst')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, dayActivities]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 bg-gray-50 dark:bg-slate-800 px-3 py-1 rounded-full">
                  {formatDateHeader(date)}
                </h4>
                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700 ml-4"></div>
              </div>

              {/* Activities for this date */}
              <div className="space-y-3">
                {dayActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.action)}`}>
                      {getActivityIcon(activity.action, activity.entity_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {activity.title}
                          </h5>
                          {activity.description && (
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                              {activity.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-slate-500">
                            <span>{t('crm.timeline.by', { name: activity.user_name })}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(activity.created_at)}</span>
                            {activity.entity_type && activity.entity_type !== 'client_interaction' && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{activity.entity_type.replace('_', ' ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity Log Modal */}
      {client && (
        <ActivityLogModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          client={client}
          onActivityLogged={handleActivityLogged}
        />
      )}
    </div>
  )
}
