'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, TrendingUp, DollarSign, Calendar, Users, CheckCircle, AlertCircle, Clock, MapPin, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import RoleGuard from '../components/RoleGuard'
import ProjectModal, { Project } from '../components/ProjectModal'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'
import { ProjectsService, ProjectFormData, ProjectWithDetails, Project as ProjectType } from '../../lib/projects-service-multi-org'

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const fadeUpItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
  },
}

const fadeInItem = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
}

interface ProjectStats {
  total_projects: number
  active_projects: number
  completed_projects: number
  route_projects: number
  total_budget: number
  total_revenue: number
}

export default function ProjectsIndex() {
  const { user, currentOrganization } = useAuth()
  const { t } = useLocale()
  const router = useRouter()
  const [stats, setStats] = useState<ProjectStats>({
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    route_projects: 0,
    total_budget: 0,
    total_revenue: 0
  })
  const [recentProjects, setRecentProjects] = useState<ProjectType[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectType, setProjectType] = useState<'general' | 'route'>('general')

  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrganization?.id) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const [statsData, projectsData] = await Promise.all([
          ProjectsService.getProjectStats(currentOrganization.id),
          ProjectsService.getProjects(currentOrganization.id)
        ])
        
        setStats(statsData)
        // Convert ProjectWithDetails to ProjectType for recent projects
        const recentProjectsData = projectsData.slice(0, 5).map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          type: project.type,
          status: project.status,
          priority: project.priority,
          start_date: project.start_date,
          end_date: project.end_date,
          budget: project.budget,
          hourly_rate: project.hourly_rate,
          progress: project.progress,
          route_notes: project.route_notes,
          estimated_duration_hours: project.estimated_duration_hours,
          organization_id: project.organization_id,
          created_by: project.created_by,
          created_at: project.created_at,
          updated_at: project.updated_at
        }))
        setRecentProjects(recentProjectsData)
      } catch (error) {
        console.error('Error fetching projects data:', error)
        // Set default stats if there's an error
        setStats({
          total_projects: 0,
          active_projects: 0,
          completed_projects: 0,
          route_projects: 0,
          total_budget: 0,
          total_revenue: 0
        })
        setRecentProjects([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentOrganization?.id])

  const handleCreateProject = () => {
    setProjectType('general') // Default to general, modal will handle type selection
    setModalMode('create')
    setSelectedProject(null)
    setIsModalOpen(true)
  }

  const handleEditProject = (project: ProjectType) => {
    setProjectType(project.type as 'general' | 'route')
    setModalMode('edit')
    // Convert ProjectType to Project interface for the modal
    const projectForModal: Project = {
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
    }
    setSelectedProject(projectForModal)
    setIsModalOpen(true)
  }

  const handleSaveProject = async (projectData: ProjectFormData): Promise<void> => {
    if (!currentOrganization?.id) return

    try {
      let projectId: string

      if (modalMode === 'create') {
        const newProject = await ProjectsService.createProject(projectData)
        projectId = newProject.id
      } else if (selectedProject) {
        const updatedProject = await ProjectsService.updateProject(selectedProject.id, projectData, currentOrganization.id, user?.id)
        projectId = updatedProject.id
      } else {
        throw new Error('No project selected for update')
      }

      // Handle client and employee assignments for route projects
      if (projectData.type === 'route') {
        // Note: The ProjectModal should pass client and employee data
        // For now, we'll skip assignments if not provided
        console.log('Route project created/updated:', projectId)
      }
      
      // Refresh data
      const [statsData, projectsData] = await Promise.all([
        ProjectsService.getProjectStats(currentOrganization.id),
        ProjectsService.getProjects(currentOrganization.id)
      ])
      
      setStats(statsData)
      setRecentProjects(projectsData.slice(0, 5))
    } catch (error) {
      console.error('Error saving project:', error)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProject(null)
  }

  const handleStatCardClick = (cardType: string) => {
    switch (cardType) {
      case 'total':
        router.push('/projects/list')
        break
      case 'active':
        router.push('/projects/list?status=active')
        break
      case 'route':
        router.push('/projects/list?type=route')
        break
      case 'budget':
        router.push('/projects/analytics')
        break
      default:
        break
    }
  }

  const statsConfig: Array<{
    titleKey: TranslationKey
    value: string
    change: string
    changeType: 'positive' | 'negative' | 'neutral'
    icon: any
    color: string
    type: string
  }> = [
    {
      titleKey: 'projects.stats.total',
      value: stats.total_projects?.toString() || '0',
      change: '',
      changeType: 'neutral',
      icon: FolderOpen,
      color: 'violet',
      type: 'total'
    },
    {
      titleKey: 'projects.stats.active',
      value: stats.active_projects?.toString() || '0',
      change: '',
      changeType: 'neutral',
      icon: CheckCircle,
      color: 'green',
      type: 'active'
    },
    {
      titleKey: 'projects.stats.route',
      value: stats.route_projects?.toString() || '0',
      change: '',
      changeType: 'neutral',
      icon: MapPin,
      color: 'blue',
      type: 'route'
    },
    {
      titleKey: 'projects.stats.budget',
      value: `$${stats.total_budget?.toLocaleString() || '0'}`,
      change: '',
      changeType: 'neutral',
      icon: DollarSign,
      color: 'emerald',
      type: 'budget'
    }
  ]

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'route': return t('projects.type.route')
      case 'internal': return t('projects.type.internal')
      case 'external': return t('projects.type.external')
      default: return t('projects.type.general')
    }
  }

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FolderOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
      case 'updated':
        return <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      case 'deleted':
        return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('projects.overview.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('projects.overview.subtitle')}
          </p>
        </div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer}
          initial="hidden"
          animate={loading ? 'hidden' : 'visible'}
        >
          {statsConfig.map((stat) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.type}
                variants={fadeUpItem}
                onClick={() => handleStatCardClick(stat.type)}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-md hover:border-violet-300 dark:hover:border-violet-600 transition-[box-shadow,border-color] duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t(stat.titleKey)}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                      {loading ? '...' : stat.value}
                    </p>
                    <p className={`text-sm mt-1 ${
                      stat.changeType === 'positive'
                        ? 'text-green-600 dark:text-green-400'
                        : stat.changeType === 'negative'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {stat.change} {t('common.stats.fromLastMonth')}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    stat.color === 'violet' ? 'bg-violet-200 dark:bg-violet-900' :
                    stat.color === 'green' ? 'bg-green-200 dark:bg-green-900' :
                    stat.color === 'emerald' ? 'bg-emerald-200 dark:bg-emerald-900' :
                    'bg-blue-200 dark:bg-blue-900'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      stat.color === 'violet' ? 'text-violet-600 dark:text-violet-400' :
                      stat.color === 'green' ? 'text-green-600 dark:text-green-400' :
                      stat.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('projects.recent.title')}
            </h2>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/projects/list')}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
            >
              {t('projects.recent.viewAll')}
            </motion.button>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {t('projects.recent.loading')}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {t('projects.recent.empty')}
              </div>
            ) : (
              <motion.div
                className="divide-y divide-gray-200 dark:divide-slate-700"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
              {recentProjects.map((project) => (
                <motion.div
                  key={project.id}
                  variants={fadeInItem}
                  onClick={() => handleEditProject(project)}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-violet-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-slate-100">
                        {project.name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          project.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          project.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          project.status === 'planning' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                          {project.status}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getProjectTypeLabel(project.type)}
                        </p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('projects.progress', { percent: project.progress || 0 })}
                        </p>
                        {project.budget && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ${project.budget.toLocaleString()}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {project.type === 'route' ? <MapPin className="w-4 h-4 text-blue-600" /> : 
                       project.type === 'internal' ? <Users className="w-4 h-4 text-emerald-600" /> :
                       <FolderOpen className="w-4 h-4 text-violet-600" />}
                    </div>
                  </div>
                </motion.div>
              ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            {t('common.quickActions')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateProject}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <FolderOpen className="w-6 h-6 text-violet-600 dark:text-violet-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('projects.quickActions.new')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('projects.quickActions.newDesc')}</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/projects/team')}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('projects.quickActions.team')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('projects.quickActions.teamDesc')}</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/projects/analytics')}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('projects.quickActions.analytics')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('projects.quickActions.analyticsDesc')}</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-slate-100">{t('projects.quickActions.timeline')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('projects.quickActions.timelineDesc')}</p>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProject}
        project={selectedProject}
        mode={modalMode}
        projectType={projectType}
      />
    </RoleGuard>
  )
}