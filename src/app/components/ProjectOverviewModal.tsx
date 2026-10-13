'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Users, Calendar, DollarSign, Clock, User, Phone, Mail, Building, ExternalLink, Route, FolderOpen } from 'lucide-react'
import { ProjectWithDetails } from '../../lib/projects-service-multi-org'
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

interface ProjectOverviewModalProps {
  isOpen: boolean
  onClose: () => void
  project: ProjectWithDetails | null
}

interface ClientDetails {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  address?: string
  website?: string
  notes?: string
}

export default function ProjectOverviewModal({ isOpen, onClose, project }: ProjectOverviewModalProps) {
  const { t, locale } = useLocale()
  const [clients, setClients] = useState<ClientDetails[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchClientDetails = async () => {
      if (!project || !isOpen) return
      
      setLoading(true)
      try {
        // For now, we'll create mock client data since we need to fetch from project_clients table
        // In a real implementation, you'd fetch actual client details
        const mockClients: ClientDetails[] = [
          {
            id: '1',
            name: 'Acme Corporation',
            email: 'contact@acme.com',
            phone: '+1 (555) 123-4567',
            company: 'Acme Corp',
            address: '123 Business St, New York, NY 10001',
            website: 'https://acme.com'
          },
          {
            id: '2',
            name: 'Tech Solutions Inc',
            email: 'info@techsolutions.com',
            phone: '+1 (555) 987-6543',
            company: 'Tech Solutions Inc',
            address: '456 Innovation Ave, San Francisco, CA 94105',
            website: 'https://techsolutions.com'
          }
        ]
        
        setClients(mockClients)
      } catch (error) {
        console.error('Error fetching client details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClientDetails()
  }, [project, isOpen])

  const openInGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    window.open(mapsUrl, '_blank', 'noopener,noreferrer')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'fi' ? 'fi-FI' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'planning':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'route':
        return <Route className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      case 'internal':
        return <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      case 'external':
        return <Building className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      default:
        return <FolderOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
    }
  }

  if (!project) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                {getTypeIcon(project.type)}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                    {project.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t(projectTypeKeys[project.type] ?? 'projects.type.general')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Project Details */}
                <div className="space-y-6">
                  {/* Status and Priority */}
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {t(projectStatusKeys[project.status] ?? 'enum.projectStatus.planning')}
                    </span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(project.priority)}`}>
                      {t(priorityKeys[project.priority] ?? 'enum.priority.medium')}
                    </span>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">{t('common.description')}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
                    </div>
                  )}

                  {/* Project Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('modal.projectOverview.projectDetails')}</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('common.timeline')}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {project.start_date ? formatDate(project.start_date) : t('common.noStartDate')} - 
                            {project.end_date ? formatDate(project.end_date) : t('common.ongoing')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Users className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('common.teamMembers')}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {project.employee_names.length > 0 ? project.employee_names.join(', ') : t('common.noTeamMembers')}
                          </p>
                        </div>
                      </div>

                      {project.budget && (
                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('common.budget')}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              ${project.budget.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {project.hourly_rate && (
                        <div className="flex items-center space-x-3">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('common.hourlyRate')}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              ${project.hourly_rate}/hour
                            </p>
                          </div>
                        </div>
                      )}

                      {project.estimated_duration_hours && (
                        <div className="flex items-center space-x-3">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('modal.projectOverview.estimatedDuration')}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {t('common.hoursUnit', { count: project.estimated_duration_hours })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">{t('common.progress')}</h3>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{project.progress || 0}%</span>
                    </div>
                  </div>

                  {/* Route Notes */}
                  {project.type === 'route' && project.route_notes && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">{t('modal.projectOverview.routeNotes')}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{project.route_notes}</p>
                    </div>
                  )}
                </div>

                {/* Right Column - Clients */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-4">{t('modal.projectOverview.clients')}</h3>
                    
                    {loading ? (
                      <div className="space-y-4">
                        {[1, 2].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : clients.length > 0 ? (
                      <div className="space-y-4">
                        {clients.map((client) => (
                          <div key={client.id} className="border border-gray-200 dark:border-slate-700 shape-sm p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-slate-100">{client.name}</h4>
                                {client.company && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{client.company}</p>
                                )}
                              </div>
                              {client.website && (
                                <a
                                  href={client.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>

                            <div className="space-y-2">
                              {client.email && (
                                <div className="flex items-center space-x-2">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  <a
                                    href={`mailto:${client.email}`}
                                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    {client.email}
                                  </a>
                                </div>
                              )}

                              {client.phone && (
                                <div className="flex items-center space-x-2">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  <a
                                    href={`tel:${client.phone}`}
                                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    {client.phone}
                                  </a>
                                </div>
                              )}

                              {client.address && (
                                <div className="flex items-start space-x-2">
                                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <div className="flex-1">
                                    <button
                                      onClick={() => openInGoogleMaps(client.address!)}
                                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-left"
                                    >
                                      {client.address}
                                    </button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {t('common.clickOpenMaps')}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">{t('modal.projectOverview.noClients')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
