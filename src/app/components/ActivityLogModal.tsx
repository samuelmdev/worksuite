'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Phone, Mail, Calendar, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { activityService, ManualInteractionData } from '@/lib/activity-service'
import { Database } from '@/lib/supabase'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

type Client = Database['public']['Tables']['clients']['Row']

interface ActivityLogModalProps {
  isOpen: boolean
  onClose: () => void
  client?: Client | null
  clients?: Client[]
  onActivityLogged?: () => void
}

interface InteractionType {
  value: ManualInteractionData['type']
  labelKey: TranslationKey
  icon: React.ReactNode
  descriptionKey: TranslationKey
}

export default function ActivityLogModal({ isOpen, onClose, client, clients = [], onActivityLogged }: ActivityLogModalProps) {
  const { t } = useLocale()

  const interactionTypes: InteractionType[] = useMemo(() => [
    {
      value: 'call',
      labelKey: 'modal.activity.type.call',
      icon: <Phone className="w-4 h-4" />,
      descriptionKey: 'modal.activity.type.callDesc',
    },
    {
      value: 'email',
      labelKey: 'modal.activity.type.email',
      icon: <Mail className="w-4 h-4" />,
      descriptionKey: 'modal.activity.type.emailDesc',
    },
    {
      value: 'meeting',
      labelKey: 'modal.activity.type.meeting',
      icon: <Calendar className="w-4 h-4" />,
      descriptionKey: 'modal.activity.type.meetingDesc',
    },
    {
      value: 'note',
      labelKey: 'modal.activity.type.note',
      icon: <FileText className="w-4 h-4" />,
      descriptionKey: 'modal.activity.type.noteDesc',
    },
    {
      value: 'task',
      labelKey: 'modal.activity.type.task',
      icon: <CheckCircle className="w-4 h-4" />,
      descriptionKey: 'modal.activity.type.taskDesc',
    },
  ], [])

  const [selectedType, setSelectedType] = useState<ManualInteractionData['type']>('call')
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens/closes or client changes
  useEffect(() => {
    if (isOpen) {
      setSelectedType('call')
      setSelectedClient(client?.id || '')
      setTitle('')
      setDescription('')
      setError(null)
    }
  }, [isOpen, client])

  // Auto-generate title based on selected type and client
  useEffect(() => {
    if (client && selectedType) {
      const type = interactionTypes.find(item => item.value === selectedType)
      if (type) {
        setTitle(t('modal.activity.titleWithClient', { type: t(type.labelKey), name: client.name }))
      }
    }
  }, [selectedType, client, interactionTypes, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const clientId = client?.id || selectedClient
    if (!clientId) {
      setError(t('modal.activity.error.clientRequired'))
      return
    }

    if (!title.trim()) {
      setError(t('modal.activity.error.titleRequired'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const interactionData: ManualInteractionData = {
        client_id: clientId,
        type: selectedType,
        subject: title.trim(),
        description: description.trim() || undefined,
        status: 'completed'
      }

      console.log('Submitting interaction data:', interactionData)
      const activityId = await activityService.createManualInteraction(interactionData)
      console.log('Activity ID returned:', activityId)
      
      if (activityId) {
        console.log('Activity logged successfully')
        onActivityLogged?.()
        onClose()
      } else {
        console.log('Failed to log activity - no ID returned')
        setError(t('modal.activity.error.saveFailed'))
      }
    } catch (err) {
      console.error('Error logging activity:', err)
      setError(t('modal.activity.error.saveFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{t('modal.activity.title')}</h2>
            {client ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('modal.activity.clientLabel', { name: client.name })}</p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('modal.activity.selectClientHint')}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Client Selector - only show if no client is preselected */}
          {!client && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('common.client')} *
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              >
                <option value="">{t('common.selectClient')}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Interaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
              {t('modal.activity.activityType')}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {interactionTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center p-3 rounded-lg border text-left transition-colors ${
                    selectedType === type.value
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className={`mr-3 ${selectedType === type.value ? 'text-cyan-500 dark:text-cyan-400' : 'text-gray-400 dark:text-slate-500'}`}>
                    {type.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-slate-100">{t(type.labelKey)}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{t(type.descriptionKey)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('common.title')} *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder={t('modal.activity.placeholder.title')}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('common.description')}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder={t('modal.activity.placeholder.description')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  {t('modal.activity.logging')}
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  {t('modal.activity.logButton')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
