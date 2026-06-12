'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Download, Calendar, FolderOpen, Users, DollarSign } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { ProjectsService } from '../../../lib/projects-service-multi-org'
import { useLocale } from '../../lib/locale'

export default function ProjectsAnalyticsPage() {
  const { t } = useLocale()
  const { user, currentOrganization } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [analyticsData, setAnalyticsData] = useState({
    totalProjects: 0,
    completedProjects: 0,
    activeProjects: 0,
    onHoldProjects: 0,
    totalBudget: 0,
    spentBudget: 0,
    teamProductivity: 0,
    clientSatisfaction: 0,
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
        const spentBudget = Math.round(totalBudget * 0.6) // Estimate 60% spent
        
        // Calculate team productivity (mock calculation for now)
        const teamProductivity = Math.round((completedProjects / Math.max(totalProjects, 1)) * 100)
        
        // Project timeline from real projects
        const projectTimeline = projectsData.slice(0, 5).map(project => ({
          name: project.name,
          progress: project.progress || 0,
          status: project.status
        }))
        
        // Mock monthly trends (could be enhanced with real time-based data)
        const monthlyTrends = [
          { month: 'Jan', projects: Math.max(1, Math.floor(totalProjects * 0.7)), completed: Math.max(0, Math.floor(completedProjects * 0.3)) },
          { month: 'Feb', projects: Math.max(1, Math.floor(totalProjects * 0.8)), completed: Math.max(0, Math.floor(completedProjects * 0.6)) },
          { month: 'Mar', projects: totalProjects, completed: completedProjects },
          { month: 'Apr', projects: totalProjects, completed: completedProjects }
        ]
        
        setAnalyticsData({
          totalProjects,
          completedProjects,
          activeProjects,
          onHoldProjects,
          totalBudget,
          spentBudget,
          teamProductivity,
          clientSatisfaction: 4.5, // Mock value
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
    <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
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
                  {Math.round((currentData.completedProjects / currentData.totalProjects) * 100)}%
                </span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Completion Rate</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">projects completed</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-200 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.round((currentData.spentBudget / currentData.totalBudget) * 100)}%
                </span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Budget Utilization</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">of total budget</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-200 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {currentData.clientSatisfaction}
                </span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Client Satisfaction</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">out of 5.0</p>
            </div>
          </div>
        </motion.div>
      </div>
    </RoleGuard>
  )
}
