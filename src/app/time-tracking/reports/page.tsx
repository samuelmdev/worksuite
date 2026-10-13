'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Download, Calendar, TrendingUp, Clock, DollarSign, Users, Building, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { TimeService } from '../../../lib/time-service-multi-org'
import { useLocale } from '../../lib/locale'

interface EmployeeSalaryData {
  user_id: string
  first_name: string
  last_name: string
  total_hours: number
  billable_hours: number
  total_revenue: number
  avg_hourly_rate: number
  entries_count: number
}

interface ClientBillingData {
  client_id: string
  client_name: string
  total_hours: number
  billable_hours: number
  unbilled_hours: number
  total_revenue: number
  entries_count: number
  billing_status: 'fully_billed' | 'partially_billed' | 'not_billed'
}

interface HoursChartData {
  period: string
  total_hours: number
  billable_hours: number
  entries_count: number
}

interface ProductivityInsights {
  billable_rate: number
  avg_hourly_rate: number
  avg_entry_duration: number
  total_revenue: number
  most_productive_day: string
  least_productive_day: string
  top_performing_employee: string
}

export default function TimeTrackingReportsPage() {
  const { t } = useLocale()
  const { user, currentOrganization } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  
  // Data states
  const [employeeData, setEmployeeData] = useState<EmployeeSalaryData[]>([])
  const [clientData, setClientData] = useState<ClientBillingData[]>([])
  const [hoursData, setHoursData] = useState<HoursChartData[]>([])
  const [insights, setInsights] = useState<ProductivityInsights | null>(null)
  const [summaryStats, setSummaryStats] = useState({
    totalHours: 0,
    billableHours: 0,
    totalRevenue: 0,
    entriesCount: 0
  })

  // Load reports data
  const loadReportsData = async () => {
    const organizationId = currentOrganization?.id
    if (!organizationId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Calculate date ranges based on current date and selected period
      const startDate = selectedPeriod === 'week' 
        ? TimeService.getWeekStart(currentDate.toISOString().split('T')[0])
        : TimeService.getMonthStart(currentDate.toISOString().split('T')[0])
      
      const endDate = selectedPeriod === 'week'
        ? TimeService.getWeekEnd(startDate)
        : TimeService.getMonthEnd(startDate)

      // Automatically determine view type based on period
      const viewType = selectedPeriod === 'week' ? 'daily' : 'weekly'

      // Load all data in parallel
      const [
        employeeSalaryData,
        clientBillingData,
        hoursChartData,
        productivityInsights
      ] = await Promise.all([
        TimeService.getEmployeeSalaryData(startDate, endDate, organizationId),
        TimeService.getClientBillingData(startDate, endDate, organizationId),
        TimeService.getHoursChartData(startDate, endDate, viewType, organizationId),
        TimeService.getProductivityInsights(startDate, endDate, organizationId)
      ])

      setEmployeeData(employeeSalaryData)
      setClientData(clientBillingData)
      setHoursData(hoursChartData)
      setInsights(productivityInsights)

      // Calculate summary stats
      const totalHours = employeeSalaryData.reduce((sum, emp) => sum + emp.total_hours, 0)
      const billableHours = employeeSalaryData.reduce((sum, emp) => sum + emp.billable_hours, 0)
      const totalRevenue = employeeSalaryData.reduce((sum, emp) => sum + emp.total_revenue, 0)
      const entriesCount = employeeSalaryData.reduce((sum, emp) => sum + emp.entries_count, 0)

      setSummaryStats({
        totalHours: Math.round(totalHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        entriesCount
      })

    } catch (error) {
      console.error('Error loading reports data:', error)
      // Set empty data to prevent infinite loading
      setEmployeeData([])
      setClientData([])
      setHoursData([])
      setInsights(null)
      setSummaryStats({
        totalHours: 0,
        billableHours: 0,
        totalRevenue: 0,
        entriesCount: 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && currentOrganization?.id) {
      loadReportsData()
    } else {
      setLoading(false)
    }
  }, [selectedPeriod, currentDate, currentOrganization?.id, user])

  // Navigation functions
  const goToPreviousPeriod = () => {
    const newDate = new Date(currentDate)
    if (selectedPeriod === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const goToNextPeriod = () => {
    const newDate = new Date(currentDate)
    if (selectedPeriod === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToCurrentPeriod = () => {
    setCurrentDate(new Date())
  }

  const canGoToNext = () => {
    const now = new Date()
    const currentPeriodEnd = selectedPeriod === 'week' 
      ? TimeService.getWeekEnd(TimeService.getWeekStart(currentDate.toISOString().split('T')[0]))
      : TimeService.getMonthEnd(TimeService.getMonthStart(currentDate.toISOString().split('T')[0]))
    
    return new Date(currentPeriodEnd) < now
  }

  const getBillingStatusIcon = (status: string) => {
    switch (status) {
      case 'fully_billed':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case 'partially_billed':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'not_billed':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getBillingStatusColor = (status: string) => {
    switch (status) {
      case 'fully_billed':
        return 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
      case 'partially_billed':
        return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'
      case 'not_billed':
        return 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700'
      default:
        return 'text-gray-700 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
    }
  }

  const formatPeriod = (period: string, viewType: 'daily' | 'weekly') => {
    const date = new Date(period)
    if (viewType === 'daily') {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    } else {
      const weekEnd = new Date(date)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }
  }

  if (loading) {
    return (
      <RoleGuard>
        <div className="flex items-center justify-center min-h-96">
          <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('time.reportsPage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('time.reportsPage.subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month')}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 shape-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="week">{t('time.reportsPage.period.week')}</option>
              <option value="month">{t('time.reportsPage.period.month')}</option>
            </select>
            <button className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white shape-sm transition-colors">
              <Download className="w-4 h-4 mr-2" />
              {t('time.reportsPage.export')}
            </button>
          </div>
        </div>

        {/* Period Navigation */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousPeriod}
              className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700 shape-sm transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous {selectedPeriod === 'week' ? 'Week' : 'Month'}
            </button>
            
            <button
              onClick={goToCurrentPeriod}
              className="px-4 py-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 shape-sm transition-colors font-medium"
            >
              Current {selectedPeriod === 'week' ? 'Week' : 'Month'}
            </button>
            
            <button
              onClick={goToNextPeriod}
              disabled={!canGoToNext()}
              className={`flex items-center px-3 py-2 shape-sm transition-colors ${
                canGoToNext()
                  ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700'
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              Next {selectedPeriod === 'week' ? 'Week' : 'Month'}
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedPeriod === 'week' ? (
              <>
                {TimeService.getWeekStart(currentDate.toISOString().split('T')[0])} - {TimeService.getWeekEnd(TimeService.getWeekStart(currentDate.toISOString().split('T')[0]))}
              </>
            ) : (
              <>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('time.reportsPage.totalHours')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {summaryStats.totalHours}
                </p>
              </div>
              <div className="p-3 shape-sm bg-cyan-200 dark:bg-cyan-900">
                <Clock className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('time.reportsPage.billableHours')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {summaryStats.billableHours}
                </p>
              </div>
              <div className="p-3 shape-sm bg-emerald-200 dark:bg-emerald-900">
                <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('time.reportsPage.totalRevenue')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  ${summaryStats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 shape-sm bg-violet-200 dark:bg-violet-900">
                <DollarSign className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Entries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  {summaryStats.entriesCount}
                </p>
              </div>
              <div className="p-3 shape-sm bg-orange-200 dark:bg-orange-900">
                <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hours Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              {selectedPeriod === 'week' ? 'Daily Hours' : 'Weekly Hours'}
            </h3>
            <div className="space-y-4">
              {hoursData.length > 0 ? (
                hoursData.map((item, index) => {
                  const maxHours = Math.max(...hoursData.map(d => d.total_hours))
                  return (
                    <div key={item.period} className="flex items-center space-x-4">
                      <div className="w-20 text-sm text-gray-600 dark:text-gray-400">
                        {formatPeriod(item.period, selectedPeriod === 'week' ? 'daily' : 'weekly')}
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-cyan-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${maxHours > 0 ? (item.total_hours / maxHours) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-16 text-sm font-medium text-gray-900 dark:text-slate-100 text-right">
                        {item.total_hours.toFixed(1)}h
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No hours data available</p>
              )}
            </div>
          </motion.div>

          {/* Top Clients */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              {t('time.reportsPage.tab.clients')}
            </h3>
            <div className="space-y-4">
              {clientData.length > 0 ? (
                clientData.slice(0, 5).map((client, index) => (
                  <div key={client.client_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 shape-sm">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <p className="font-medium text-gray-900 dark:text-slate-100">{client.client_name}</p>
                        {getBillingStatusIcon(client.billing_status)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {client.billable_hours.toFixed(1)}h billed • {client.unbilled_hours.toFixed(1)}h pending
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-cyan-600 dark:text-cyan-400">
                        ${client.total_revenue.toLocaleString()}
                      </p>
                      <span className={`px-2 py-1 text-xs rounded-full ${getBillingStatusColor(client.billing_status)}`}>
                        {client.billing_status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No client data available</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Employee Salary Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            {t('time.reportsPage.tab.employees')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-slate-100">{t('common.employee')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-slate-100">Hours</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-slate-100">Avg Rate</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-slate-100">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-slate-100">Entries</th>
                </tr>
              </thead>
              <tbody>
                {employeeData.length > 0 ? (
                  employeeData.map((employee, index) => (
                    <tr key={employee.user_id} className="border-b border-gray-100 dark:border-slate-700">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-medium text-gray-900 dark:text-slate-100">
                            {employee.first_name} {employee.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900 dark:text-slate-100">
                        {employee.billable_hours.toFixed(1)}h
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900 dark:text-slate-100">
                        ${employee.avg_hourly_rate.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-cyan-600 dark:text-cyan-400">
                        ${employee.total_revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900 dark:text-slate-100">
                        {employee.entries_count}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No employee data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Productivity Insights */}
        {insights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              {t('time.reportsPage.tab.insights')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-cyan-200 dark:bg-cyan-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                    {insights.billable_rate}%
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100">{t('time.reportsPage.billableRate')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">of total hours</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-200 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${insights.avg_hourly_rate}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100">Avg Hourly Rate</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">per billable hour</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-violet-200 dark:bg-violet-900 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                    {insights.avg_entry_duration}h
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-slate-100">Avg Entry Duration</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">hours per entry</p>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 shape-sm">
                <h5 className="font-medium text-gray-900 dark:text-slate-100 mb-1">Most Productive Day</h5>
                <p className="text-sm text-cyan-600 dark:text-cyan-400">{insights.most_productive_day}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 shape-sm">
                <h5 className="font-medium text-gray-900 dark:text-slate-100 mb-1">Least Productive Day</h5>
                <p className="text-sm text-orange-600 dark:text-orange-400">{insights.least_productive_day}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-slate-700 shape-sm">
                <h5 className="font-medium text-gray-900 dark:text-slate-100 mb-1">Top Performer</h5>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{insights.top_performing_employee}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </RoleGuard>
  )
}