'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, XCircle, FolderOpen, User, Calendar, DollarSign, MapPin, Clock } from 'lucide-react'
import { useAuth } from '../lib/auth-context-multi-org'
import { ProjectsService, ProjectFormData } from '../../lib/projects-service-multi-org'
import { ClientService } from '../../lib/client-service-multi-org'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

const projectTypeKeys: Record<string, TranslationKey> = {
  general: 'projects.type.general',
  route: 'projects.type.route',
  internal: 'projects.type.internal',
  external: 'projects.type.external',
}

const projectStatusKeys: Record<string, TranslationKey> = {
  planning: 'enum.projectStatus.planning',
  active: 'enum.projectStatus.active',
  'on-hold': 'enum.projectStatus.onHold',
  completed: 'enum.projectStatus.completed',
  cancelled: 'enum.projectStatus.cancelled',
}

const priorityKeys: Record<string, TranslationKey> = {
  low: 'enum.priority.low',
  medium: 'enum.priority.medium',
  high: 'enum.priority.high',
  urgent: 'enum.priority.urgent',
}

export interface Project {
  id: string
  name: string
  description: string
  type: 'general' | 'route' | 'internal' | 'external'
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  start_date?: string
  end_date?: string
  budget?: number
  hourly_rate?: number
  progress: number // 0-100
  route_notes?: string
  estimated_duration_hours?: number
  organization_id: string
  created_by: string
  created_at: string
  updated_at: string
}

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (project: ProjectFormData) => Promise<void>
  project?: Project | null
  mode: 'create' | 'edit'
  projectType?: 'general' | 'route' // Default project type when creating
}

export default function ProjectModal({ isOpen, onClose, onSave, project, mode, projectType = 'general' }: ProjectModalProps) {
  const { user, currentOrganization } = useAuth()
  const { t } = useLocale()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: projectType as Project['type'],
    status: 'planning' as Project['status'],
    priority: 'medium' as Project['priority'],
    start_date: '',
    end_date: '',
    budget: '',
    hourly_rate: '',
    progress: 0,
    route_notes: '',
    estimated_duration_hours: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clients, setClients] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Array<{user_id: string, role: string, hourly_rate?: number}>>([])
  const [loading, setLoading] = useState(false)

  // Load clients and users when modal opens
  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      console.log('ProjectModal: Loading clients and users for organization:', currentOrganization.id)
      const loadData = async () => {
        try {
          const [clientsData, usersData] = await Promise.all([
            ClientService.getClients(currentOrganization.id),
            ClientService.getUsers(currentOrganization.id)
          ])
          console.log('ProjectModal: Fetched clients:', clientsData)
          console.log('ProjectModal: Fetched users:', usersData)
          setClients(clientsData)
          setUsers(usersData)
        } catch (error) {
          console.error('Error loading data:', error)
        }
      }
      loadData()
    } else {
      console.log('ProjectModal: Not loading data - isOpen:', isOpen, 'orgId:', currentOrganization?.id)
    }
  }, [isOpen, currentOrganization?.id])

  useEffect(() => {
    if (project && mode === 'edit') {
      setFormData({
        name: project.name,
        description: project.description || '',
        type: project.type,
        status: project.status,
        priority: project.priority,
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        budget: project.budget?.toString() || '',
        hourly_rate: project.hourly_rate?.toString() || '',
        progress: project.progress,
        route_notes: project.route_notes || '',
        estimated_duration_hours: project.estimated_duration_hours?.toString() || ''
      })
    } else {
      setFormData({
        name: '',
        description: '',
        type: projectType,
        status: 'planning',
        priority: 'medium',
        start_date: '',
        end_date: '',
        budget: '',
        hourly_rate: '',
        progress: 0,
        route_notes: '',
        estimated_duration_hours: ''
      })
    }
    setErrors({})
    setSelectedClients([])
    setSelectedUsers([])
  }, [project, mode, isOpen, projectType])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('modal.project.error.nameRequired')
    }

    if (formData.type === 'route' && selectedClients.length === 0) {
      newErrors.clients = t('modal.project.error.clientsRequired')
    }

    if (formData.type === 'route' && selectedUsers.length === 0) {
      newErrors.users = t('modal.project.error.usersRequired')
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      if (end <= start) {
        newErrors.end_date = t('modal.project.error.endDateAfterStart')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !currentOrganization?.id || !user?.id) {
      return
    }

    setLoading(true)
    
    try {
      const budget = formData.budget ? parseFloat(formData.budget) : undefined
      const hourly_rate = formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined
      const estimated_duration_hours = formData.estimated_duration_hours ? parseFloat(formData.estimated_duration_hours) : undefined
      
      const projectData: ProjectFormData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        status: formData.status,
        priority: formData.priority,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        budget,
        hourly_rate,
        progress: formData.progress,
        route_notes: formData.route_notes || undefined,
        estimated_duration_hours,
        organization_id: currentOrganization.id,
        created_by: user.id
      }
      
      await onSave(projectData)
      onClose()
    } catch (error) {
      console.error('Error saving project:', error)
      setErrors({ submit: t('modal.project.error.saveFailed') })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleClientToggle = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const handleUserToggle = (userId: string, role: string, hourlyRate?: number) => {
    setSelectedUsers(prev => {
      const existing = prev.find(u => u.user_id === userId)
      if (existing) {
        return prev.filter(u => u.user_id !== userId)
      } else {
        return [...prev, { user_id: userId, role, hourly_rate: hourlyRate }]
      }
    })
  }


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="relative bg-white dark:bg-slate-800 shape-sm shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {mode === 'create' ? t('modal.project.createTitle') : t('modal.project.editTitle')}
              </h2>
              <button
                onClick={onClose}
                className="p-2 shape-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.project.projectName')} *
                  </label>
                  <div className="relative">
                    <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                        errors.name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder={t('modal.project.placeholder.name')}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                  )}
                </div>

                {/* Project Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.project.projectType')}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  >
                    {Object.entries(projectTypeKeys).map(([value, key]) => (
                      <option key={value} value={value}>{t(key)}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.status')}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  >
                    {Object.entries(projectStatusKeys).map(([value, key]) => (
                      <option key={value} value={value}>{t(key)}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.priority')}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  >
                    {Object.entries(priorityKeys).map(([value, key]) => (
                      <option key={value} value={value}>{t(key)}</option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.startDate')}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                        errors.start_date ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                    />
                  </div>
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.start_date}</p>
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.endDate')}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                        errors.end_date ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                    />
                  </div>
                  {errors.end_date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.end_date}</p>
                  )}
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.project.budget')}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => handleInputChange('budget', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Hourly Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.project.hourlyRate')}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Progress */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.project.progressLabel', { percent: formData.progress })}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => handleInputChange('progress', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-slate-700 shape-sm appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('common.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  placeholder={t('modal.project.placeholder.description')}
                />
              </div>

              {/* Route-specific fields */}
              {formData.type === 'route' && (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 shape-sm border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">{t('modal.project.routeDetails')}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Estimated Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('modal.project.estimatedDuration')}
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          step="0.5"
                          value={formData.estimated_duration_hours}
                          onChange={(e) => handleInputChange('estimated_duration_hours', e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                          placeholder="0.0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Route Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('modal.project.routeNotes')}
                    </label>
                    <textarea
                      value={formData.route_notes}
                      onChange={(e) => handleInputChange('route_notes', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      placeholder={t('modal.project.placeholder.routeNotes')}
                    />
                  </div>
                </div>
              )}

              {/* Clients (for route projects) */}
              {formData.type === 'route' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.project.clientsOnRoute')} *
                  </label>
                  {errors.clients && (
                    <p className="mb-2 text-sm text-red-600 dark:text-red-400">{errors.clients}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {clients.length === 0 ? (
                      <div className="col-span-2 p-4 text-center text-gray-500 dark:text-gray-400">
                        {t('modal.project.noClientsAvailable')}
                      </div>
                    ) : (
                      clients.map(client => (
                        <label key={client.id} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-slate-600 shape-sm hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedClients.includes(client.id)}
                            onChange={() => handleClientToggle(client.id)}
                            className="w-4 h-4 text-violet-600 bg-gray-200 border-gray-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{client.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{client.address || t('common.noAddress')}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Team Members / Employees */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {formData.type === 'route' ? t('modal.project.employeesOnRoute') + ' *' : t('modal.project.teamMembers')}
                </label>
                {errors.users && (
                  <p className="mb-2 text-sm text-red-600 dark:text-red-400">{errors.users}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {users.length === 0 ? (
                    <div className="col-span-2 p-4 text-center text-gray-500 dark:text-gray-400">
                      {t('modal.project.noTeamAvailable')}
                    </div>
                  ) : (
                    users.map(user => (
                    <label key={user.id} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-slate-600 shape-sm hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUsers.some(u => u.user_id === user.id)}
                        onChange={() => handleUserToggle(user.id, 'employee', user.hourly_rate)}
                        className="w-4 h-4 text-violet-600 bg-gray-200 border-gray-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.hourly_rate ? `$${user.hourly_rate}/hr` : t('modal.project.noRateSet')}
                        </p>
                      </div>
                    </label>
                  ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 shape-sm hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 disabled:cursor-not-allowed shape-sm transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? t('common.saving') : (mode === 'create' ? t('modal.project.createButton') : t('modal.client.saveChanges'))}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
