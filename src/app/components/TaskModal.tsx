'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, User, AlertCircle, Clock, CheckSquare } from 'lucide-react'
import { TasksService, TaskFormData } from '../../lib/tasks-service'
import type { ClientOption as Client } from '../../lib/client-types'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'


const taskTypeKeys: Record<string, TranslationKey> = {
  call: 'enum.taskType.call',
  meeting: 'enum.taskType.meeting',
  email: 'enum.taskType.email',
  follow_up: 'enum.taskType.followUp',
  proposal: 'enum.taskType.proposal',
  contract_review: 'enum.taskType.contractReview',
  other: 'enum.taskType.other',
}

const priorityKeys: Record<string, TranslationKey> = {
  low: 'enum.priority.low',
  medium: 'enum.priority.medium',
  high: 'enum.priority.high',
  urgent: 'enum.priority.urgent',
}

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (task: any) => void
  clients: Client[]
  preselectedClient?: Client
  task?: any
  mode: 'create' | 'edit'
}

export default function TaskModal({ 
  isOpen, 
  onClose, 
  onSave, 
  clients, 
  preselectedClient,
  task,
  mode 
}: TaskModalProps) {
  const { t } = useLocale()
  const [formData, setFormData] = useState<TaskFormData>({
    client_id: null,
    title: '',
    description: '',
    task_type: 'call',
    priority: 'medium',
    due_date: '',
    is_scheduled: false,
    assigned_to: null
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && task) {
        setFormData({
          client_id: task.client_id || null,
          title: task.title || '',
          description: task.description || '',
          task_type: task.task_type || 'call',
          priority: task.priority || 'medium',
          due_date: task.due_date ? task.due_date.split('T')[0] : '',
          is_scheduled: task.is_scheduled || false,
          assigned_to: task.assigned_to || null
        })
      } else if (preselectedClient) {
        setFormData(prev => ({
          ...prev,
          client_id: preselectedClient.id,
          title: '',
          description: '',
          task_type: 'call',
          priority: 'medium',
          due_date: '',
          is_scheduled: false,
          assigned_to: null
        }))
      } else {
        setFormData({
          client_id: null,
          title: '',
          description: '',
          task_type: 'call',
          priority: 'medium',
          due_date: '',
          is_scheduled: false,
          assigned_to: null
        })
      }
      setErrors({})
    }
  }, [isOpen, mode, task, preselectedClient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) {
      newErrors.title = t('modal.task.error.titleRequired')
    }
    if (!formData.client_id || formData.client_id === '') {
      newErrors.client_id = t('modal.task.error.clientRequired')
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    try {
      // Clean form data - convert empty strings to undefined for UUID and date fields
      const cleanFormData = {
        ...formData,
        client_id: formData.client_id || undefined,
        assigned_to: formData.assigned_to || undefined,
        due_date: formData.due_date || undefined
      }
      
      let savedTask
      if (mode === 'edit' && task) {
        savedTask = await TasksService.updateTask(task.id, cleanFormData)
      } else {
        savedTask = await TasksService.createTask(cleanFormData)
      }
      onSave(savedTask)
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      setErrors({ submit: t('modal.task.error.saveFailed') })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof TaskFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Auto-populate contact info when client and task type are selected
  useEffect(() => {
    if (formData.client_id && (formData.task_type === 'call' || formData.task_type === 'email')) {
      const client = clients.find(c => c.id === formData.client_id)
      if (client) {
        let contactInfo = ''
        const companySuffix = client.company
          ? t('modal.task.contact.companySuffix', { company: client.company })
          : ''

        if (formData.task_type === 'call') {
          if (client.phone) {
            contactInfo = t('modal.task.contact.call', {
              name: client.name,
              phone: client.phone,
              company: companySuffix,
            })
          } else {
            contactInfo = t('modal.task.contact.callNoPhone', {
              name: client.name,
              company: companySuffix,
            })
          }
        } else if (formData.task_type === 'email') {
          if (client.email) {
            contactInfo = t('modal.task.contact.email', {
              name: client.name,
              email: client.email,
              company: companySuffix,
            })
          } else {
            contactInfo = t('modal.task.contact.emailNoEmail', {
              name: client.name,
              company: companySuffix,
            })
          }
        }

        if (contactInfo && !formData.description) {
          setFormData(prev => ({ ...prev, description: contactInfo }))
        }
      }
    } else if (formData.task_type !== 'call' && formData.task_type !== 'email') {
      if (formData.description && (formData.description.startsWith('Call ') || formData.description.startsWith('Email ') || formData.description.startsWith('Soita ') || formData.description.startsWith('Lähetä '))) {
        setFormData(prev => ({ ...prev, description: '' }))
      }
    }
  }, [formData.client_id, formData.task_type, clients, t])

  if (!isOpen) return null

  const selectedClient = clients.find(c => c.id === formData.client_id)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {mode === 'edit' ? t('modal.task.editTitle') : t('modal.task.createTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('common.client')} *
            </label>
            <select
              value={formData.client_id || ''}
              onChange={(e) => handleInputChange('client_id', e.target.value === '' ? null : e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                errors.client_id ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              }`}
            >
              <option value="">{t('common.selectClient')}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.company && `(${client.company})`}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client_id}</p>
            )}
            {selectedClient && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  <strong>{t('common.selected')}</strong> {selectedClient.name}
                  {selectedClient.company && ` - ${selectedClient.company}`}
                </p>
                {selectedClient.email && (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {selectedClient.email}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('modal.task.taskTitle')} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                errors.title ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              }`}
              placeholder={t('modal.task.placeholder.title')}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('common.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder={t('modal.task.placeholder.description')}
            />
            {formData.client_id && (formData.task_type === 'call' || formData.task_type === 'email') && selectedClient && (
              <div className="mt-2 text-xs text-cyan-600 dark:text-cyan-400 flex items-center">
                <div className="w-1 h-1 bg-cyan-500 rounded-full mr-2"></div>
                {t('modal.task.contactAutoHint')}
              </div>
            )}
          </div>

          {/* Task Type and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('modal.task.taskType')}
              </label>
              <select
                value={formData.task_type}
                onChange={(e) => handleInputChange('task_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              >
                {Object.entries(taskTypeKeys).map(([value, key]) => (
                  <option key={value} value={value}>{t(key)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('common.priority')}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              >
                {Object.entries(priorityKeys).map(([value, key]) => (
                  <option key={value} value={value}>{t(key)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('modal.task.dueDate')}
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          {/* Scheduled */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_scheduled"
              checked={formData.is_scheduled}
              onChange={(e) => handleInputChange('is_scheduled', e.target.checked)}
              className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <label htmlFor="is_scheduled" className="ml-2 block text-sm text-gray-700 dark:text-slate-300">
              {t('modal.task.scheduledTask')}
            </label>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('common.assignedTo')}
            </label>
            <input
              type="text"
              value={formData.assigned_to || ''}
              onChange={(e) => handleInputChange('assigned_to', e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder={t('modal.task.placeholder.assignee')}
            />
          </div>

          {/* Action Buttons */}
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
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  {mode === 'edit' ? t('modal.task.updateButton') : t('modal.task.createButton')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}