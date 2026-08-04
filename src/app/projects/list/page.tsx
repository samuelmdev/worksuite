'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Edit, Trash2, FolderOpen, Calendar, Users, DollarSign, TrendingUp, User } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import RoleGuard from '../../components/RoleGuard'
import ProjectModal, { Project } from '../../components/ProjectModal'
import ProjectOverviewModal from '../../components/ProjectOverviewModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useAuth } from '../../lib/auth-context-multi-org'
import { ProjectsService, ProjectFormData, ProjectWithDetails } from '../../../lib/projects-service-multi-org'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

const fadeInItem = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
}


export default function ProjectsListPage() {
  const { t } = useLocale()
  const { user, currentOrganization } = useAuth()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithDetails[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedProjectForOverview, setSelectedProjectForOverview] = useState<ProjectWithDetails | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  // Fetch projects data
  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentOrganization?.id) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const projectsData = await ProjectsService.getProjects(currentOrganization.id)
        setProjects(projectsData)
      } catch (error) {
        console.error('Error fetching projects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [currentOrganization?.id])

  // Handle URL parameters on component mount
  useEffect(() => {
    const statusParam = searchParams.get('status')
    const typeParam = searchParams.get('type')
    
    if (statusParam) {
      setStatusFilter(statusParam)
    }
    if (typeParam) {
      setTypeFilter(typeParam)
    }
  }, [searchParams])

  // Filter projects based on search term, status, and type
  useEffect(() => {
    let filtered = projects

    if (searchTerm.trim()) {
      filtered = filtered.filter(project => {
        return (
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          project.client_names.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      })
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(project => project.type === typeFilter)
    }

    setFilteredProjects(filtered)
  }, [searchTerm, statusFilter, typeFilter, projects])

  const handleAddProject = () => {
    setSelectedProject(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project)
    setIsDeleteDialogOpen(true)
  }

  const handleViewProject = (project: ProjectWithDetails) => {
    setSelectedProjectForOverview(project)
    setIsOverviewModalOpen(true)
  }

  const convertToProject = (project: ProjectWithDetails): Project => ({
    id: project.id,
    name: project.name,
    description: project.description || '',
    type: project.type,
    status: project.status,
    priority: project.priority,
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    budget: project.budget,
    hourly_rate: project.hourly_rate,
    progress: project.progress || 0,
    route_notes: project.route_notes,
    estimated_duration_hours: project.estimated_duration_hours,
    organization_id: project.organization_id,
    created_by: project.created_by,
    created_at: project.created_at,
    updated_at: project.updated_at
  })

  const handleSaveProject = async (projectData: ProjectFormData): Promise<void> => {
    if (!currentOrganization?.id) return

    try {
      if (modalMode === 'create') {
        const newProject = await ProjectsService.createProject(projectData)
        // Refresh projects list
        const projectsData = await ProjectsService.getProjects(currentOrganization.id)
        setProjects(projectsData)
      } else if (selectedProject) {
        await ProjectsService.updateProject(selectedProject.id, projectData, currentOrganization.id, user?.id)
        // Refresh projects list
        const projectsData = await ProjectsService.getProjects(currentOrganization.id)
        setProjects(projectsData)
      }
    } catch (error) {
      console.error('Error saving project:', error)
    }
  }

  const handleConfirmDelete = async () => {
    if (selectedProject && currentOrganization?.id) {
      try {
        await ProjectsService.deleteProject(selectedProject.id, currentOrganization.id)
        // Refresh projects list
        const projectsData = await ProjectsService.getProjects(currentOrganization.id)
        setProjects(projectsData)
      } catch (error) {
        console.error('Error deleting project:', error)
      }
    }
  }

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'planning':
        return 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'on-hold':
        return 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'completed':
        return 'bg-violet-200 dark:bg-violet-900 text-violet-800 dark:text-violet-200'
      case 'cancelled':
        return 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'high':
        return 'bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
      case 'medium':
        return 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'low':
        return 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
      default:
        return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getProjectStatusLabel = (status: string) => {
    const map: Record<string, TranslationKey> = {
      planning: 'enum.projectStatus.planning',
      active: 'enum.projectStatus.active',
      'on-hold': 'enum.projectStatus.onHold',
      completed: 'enum.projectStatus.completed',
      cancelled: 'enum.projectStatus.cancelled',
    }
    return t(map[status] ?? 'enum.projectStatus.planning')
  }

  const getPriorityLabel = (priority: string) => {
    const map: Record<string, TranslationKey> = {
      low: 'enum.priority.low',
      medium: 'enum.priority.medium',
      high: 'enum.priority.high',
      urgent: 'enum.priority.urgent',
    }
    return t(map[priority] ?? 'enum.priority.medium')
  }

  const getProjectTypeLabel = (type: string) => {
    const map: Record<string, TranslationKey> = {
      route: 'projects.type.route',
      internal: 'projects.type.internal',
      external: 'projects.type.external',
      general: 'projects.type.general',
    }
    return t(map[type] ?? 'projects.type.general')
  }

  return (
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('projects.listPage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('projects.listPage.subtitle')}
            </p>
          </div>
          <button
            onClick={handleAddProject}
            className="flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('projects.listPage.add')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('projects.listPage.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="all">{t('common.allStatus')}</option>
            <option value="planning">{t('enum.projectStatus.planning')}</option>
            <option value="active">{t('enum.projectStatus.active')}</option>
            <option value="on-hold">{t('enum.projectStatus.onHold')}</option>
            <option value="completed">{t('enum.projectStatus.completed')}</option>
            <option value="cancelled">{t('enum.projectStatus.cancelled')}</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="all">{t('projects.listPage.filter.allTypes')}</option>
            <option value="general">{t('projects.type.general')}</option>
            <option value="route">{t('projects.type.route')}</option>
          </select>
        </div>

        {/* Projects List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{t('projects.listPage.loading')}</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 text-center">
              <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {t('projects.listPage.empty.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? t('projects.listPage.empty.filtered')
                  : t('projects.listPage.empty.desc')
                }
              </p>
              {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
                <button
                  onClick={handleAddProject}
                  className="inline-flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('projects.listPage.add')}
                </button>
              )}
            </div>
          ) : (
            <motion.div
              className="divide-y divide-gray-200 dark:divide-slate-700"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {filteredProjects.map((project) => {
                return (
                  <motion.div
                    key={project.id}
                    variants={fadeInItem}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    onClick={() => handleViewProject(project)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            {project.name}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                            {getProjectStatusLabel(project.status)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(project.priority)}`}>
                            {getPriorityLabel(project.priority)}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            project.type === 'route' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            project.type === 'internal' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' :
                            project.type === 'external' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                            'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400'
                          }`}>
                            {getProjectTypeLabel(project.type)}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {project.description || '—'}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>{project.client_names.length > 0 ? project.client_names.join(', ') : 'No clients'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {project.start_date ? formatDate(project.start_date) : t('common.noStartDate')} - 
                              {project.end_date ? formatDate(project.end_date) : t('common.ongoing')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>{project.employee_count} members</span>
                          </div>
                          {project.budget && (
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4" />
                              <span>${project.budget.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.progress')}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{project.progress || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${project.progress || 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Team Members */}
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {project.employee_names.length > 0 ? project.employee_names.join(', ') : t('common.noTeamMembers')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditProject(convertToProject(project))
                          }}
                          className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(convertToProject(project))
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>

        {/* Project Modal */}
        <ProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProject}
          project={selectedProject}
          mode={modalMode}
        />

        {/* Project Overview Modal */}
        <ProjectOverviewModal
          isOpen={isOverviewModalOpen}
          onClose={() => setIsOverviewModalOpen(false)}
          project={selectedProjectForOverview}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title={t('projects.listPage.delete.title')}
          message={t('projects.listPage.delete.message', { name: selectedProject?.name ?? '' })}
          confirmText={t('common.delete')}
          type="danger"
        />
      </div>
    </RoleGuard>
  )
}
