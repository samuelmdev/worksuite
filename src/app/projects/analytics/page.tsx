'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Download, Calendar, FolderOpen, Users, DollarSign } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { ProjectsService } from '../../../lib/projects-service-multi-org'
import { useLocale } from '../../lib/locale'

interface ProjectTimelineEntry {
  name: string
  progress: number
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
}

interface MonthlyTrend {
  month: string
  projects: number
  completed: number
}

interface AnalyticsData {
  totalProjects: number
  completedProjects: number
  activeProjects: number
  onHoldProjects: number
  totalBudget: number
  spentBudget: number
  teamProductivity: number
  averageProgress: number
  projectTimeline: ProjectTimelineEntry[]
  monthlyTrends: MonthlyTrend[]
}

export default function ProjectsAnalyticsPage() {
  const { t } = useLocale()
  const { user, currentOrganization } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalProjects: 0,
    completedProjects: 0,
    activeProjects: 0,
    onHoldProjects: 0,
    totalBudget: 0,
    spentBudget: 0,
    teamProductivity: 0,
    averageProgress: 0,
    projectTimeline: [],
    monthlyTrends: []
  })
  const [loading, setLoading] = useState(true)

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!currentOrganization?.id) return
      
      try {
        setLoading(true)
        const [statsData, projectsData] = await Promise.all([
          ProjectsService.getProjectStats(currentOrganization.id),
          ProjectsService.getProjects(currentOrganization.id)
        ])
        
        // Calculate analytics data from real data
        const totalProjects = statsData.total_projects
        const completedProjects = statsData.completed_projects
        const activeProjects = statsData.active_projects
        const onHoldProjects = projectsData.filter(p => p.status === 'on-hold').length
        const totalBudget = statsData.total_budget

        // Budget consumed so far, derived from each project's reported progress
        // against its own budget rather than a flat organisation-wide estimate.
        const spentBudget = Math.round(
          projectsData.reduce(
            (sum, p) => sum + ((p.budget || 0) * (p.progress || 0)) / 100,
            0
          )
        )

        const teamProductivity = Math.round((completedProjects / Math.max(totalProjects, 1)) * 100)

        const averageProgress = projectsData.length
          ? Math.round(
              projectsData.reduce((sum, p) => sum + (p.progress || 0), 0) / projectsData.length
            )
          : 0

        // Project timeline from real projects
        const projectTimeline: ProjectTimelineEntry[] = projectsData.slice(0, 5).map(project => ({
          name: project.name,
          progress: project.progress || 0,
          status: project.status
        }))

        // Trailing six months, bucketed from real project timestamps. A project
        // counts as "completed" in the month it last moved to the completed state.
        const now = new Date()
        const monthlyTrends: MonthlyTrend[] = Array.from({ length: 6 }, (_, i) => {
          const bucket = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
          const nextBucket = new Date(bucket.getFullYear(), bucket.getMonth() + 1, 1)
          const inBucket = (value?: string) => {
            if (!value) return false
            const d = new Date(value)
            return d >= bucket && d < nextBucket
          }

          return {
            month: bucket.toLocaleDateString(undefined, { month: 'short' }),
            projects: projectsData.filter(p => inBucket(p.created_at)).length,
            completed: projectsData.filter(
              p => p.status === 'completed' && inBucket(p.updated_at)
            ).length
          }
        })

        setAnalyticsData({
          totalProjects,
          completedProjects,
          activeProjects,
          onHoldProjects,
          totalBudget,
          spentBudget,
          teamProductivity,
          averageProgress,
          projectTimeline,
          monthlyTrends
        })
      } catch (error) {
        console.error('Error fetching analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [currentOrganization?.id])

  const currentData = analyticsData

  return (
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('projects.analyticsPage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('projects.analyticsPage.subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="month">{t('projects.analyticsPage.period.month')}</option>
              <option value="quarter">{t('projects.analyticsPage.period.quarter')}</option>
            </select>
            <button className="flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
              <Download className="w-4 h-4 mr-2" />
              {t('projects.analyticsPage.export')}
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('projects.analyticsPage.totalProjects')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {loading ? '...' : currentData.totalProjects}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-violet-200 dark:bg-violet-900">
                <FolderOpen className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('projects.analyticsPage.completed')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {loading ? '...' : currentData.completedProjects}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-200 dark:bg-green-900">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('projects.analyticsPage.spentBudget')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {loading ? '...' : `$${currentData.spentBudget.toLocaleString()}`}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-200 dark:bg-emerald-900">
                <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('projects.analyticsPage.teamProductivity')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {loading ? '...' : `${currentData.teamProductivity}%`}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-200 dark:bg-blue-900">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Progress */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              {t('projects.analyticsPage.projectTimeline')}
            </h3>
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-8 animate-pulse"></div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : currentData.projectTimeline.length > 0 ? (
                currentData.projectTimeline.map((project, index) => (
                  <div key={project.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {project.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          project.status === 'completed' ? 'bg-green-600' : 'bg-violet-600'
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('projects.listPage.empty.title')}</p>
              )}
            </div>
          </motion.div>

          {/* Monthly Trends */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              {selectedPeriod === 'month' ? 'Monthly Trends' : 'Quarterly Trends'}
            </h3>
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-12 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-24 animate-pulse"></div>
                      </div>
                      <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-8 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                currentData.monthlyTrends.map((trend, index) => (
                  <div key={trend.month} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{trend.month}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {trend.completed} of {trend.projects} completed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-violet-600 dark:text-violet-400">
                        {trend.projects > 0 ? Math.round((trend.completed / trend.projects) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Performance Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Performance Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-200 dark:bg-violet-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {currentData.totalProjects > 0
                    ? Math.round((currentData.completedProjects / currentData.totalProjects) * 100)
                    : 0}%
                </span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Completion Rate</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">projects completed</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-200 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {currentData.totalBudget > 0
                    ? Math.round((currentData.spentBudget / currentData.totalBudget) * 100)
                    : 0}%
                </span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Budget Utilization</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">of total budget</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-200 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {currentData.averageProgress}%
                </span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Average Progress</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">across all projects</p>
            </div>
          </div>
        </motion.div>
      </div>
    </RoleGuard>
  )
}
