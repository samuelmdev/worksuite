'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckSquare,
  BarChart3,
  RefreshCw,
  Loader2
} from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useCRM } from '../../lib/crm-context'
import { useAuth } from '../../lib/auth-context-multi-org'
import { TasksService } from '../../../lib/tasks-service'
import { ContractsService } from '../../../lib/contracts-service-multi-org'
import { exportTableToExcel, exportTableToPDF, type ExportColumn } from '../../../lib/export-utils'
import type { Client } from '../../components/ClientModal'
import type { Contract } from '../../../lib/contracts-service-multi-org'
import type { Task } from '../../../lib/tasks-service'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

function withTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    promise
      .then((value) => { clearTimeout(timer); resolve(value) })
      .catch((err) => { clearTimeout(timer); reject(err) })
  })
}

const reportTabs: { id: 'overview' | 'clients' | 'contracts' | 'tasks' | 'revenue'; labelKey: TranslationKey; icon: typeof BarChart3 }[] = [
  { id: 'overview', labelKey: 'crm.reportsPage.tab.overview', icon: BarChart3 },
  { id: 'clients', labelKey: 'crm.reportsPage.tab.clients', icon: Users },
  { id: 'contracts', labelKey: 'crm.reportsPage.tab.contracts', icon: FileText },
  { id: 'tasks', labelKey: 'crm.reportsPage.tab.tasks', icon: CheckSquare },
  { id: 'revenue', labelKey: 'crm.reportsPage.tab.revenue', icon: DollarSign },
]

const revenuePeriods: { id: 'annual' | 'monthly' | 'predicted'; labelKey: TranslationKey }[] = [
  { id: 'annual', labelKey: 'crm.reportsPage.revenue.annual' },
  { id: 'monthly', labelKey: 'crm.reportsPage.revenue.monthly' },
  { id: 'predicted', labelKey: 'crm.reportsPage.revenue.predicted' },
]

const overviewExportColumns: ExportColumn<{ metric: string; value: string | number }>[] = [
  { header: 'Metric', value: (row) => row.metric },
  { header: 'Value', value: (row) => row.value },
]

const clientReportColumns: ExportColumn<Client>[] = [
  { header: 'Name', value: (row) => row.name },
  { header: 'Email', value: (row) => row.email },
  { header: 'Company', value: (row) => row.company },
  { header: 'Phone', value: (row) => row.phone || '' },
  { header: 'Created', value: (row) => new Date(row.createdAt).toLocaleDateString() },
]

const contractReportColumns: ExportColumn<Contract>[] = [
  { header: 'Contract', value: (row) => row.name },
  { header: 'Client', value: (row) => row.clients?.name || 'No client' },
  { header: 'Type', value: (row) => row.type.replace('_', ' ') },
  { header: 'Status', value: (row) => row.status },
  {
    header: 'Value',
    value: (row) => `$${(row.monthly_value || row.value || 0).toLocaleString()}`,
  },
  {
    header: 'Start Date',
    value: (row) => (row.start_date ? new Date(row.start_date).toLocaleDateString() : 'N/A'),
  },
]

const taskReportColumns: ExportColumn<Task>[] = [
  { header: 'Task', value: (row) => row.title },
  { header: 'Client', value: (row) => row.client_name || 'No client' },
  { header: 'Type', value: (row) => row.task_type.replace('_', ' ') },
  { header: 'Priority', value: (row) => row.priority },
  { header: 'Status', value: (row) => row.status.replace('_', ' ') },
  {
    header: 'Due Date',
    value: (row) => (row.due_date ? new Date(row.due_date).toLocaleDateString() : 'No due date'),
  },
]

interface ReportData {
  clients: any[]
  contracts: any[]
  tasks: any[]
  stats: {
    totalClients: number
    activeContracts: number
    pendingTasks: number
    monthlyRevenue: number
    clientGrowth: number
    contractGrowth: number
    taskCompletion: number
  }
}

export default function CRMReportsPage() {
  const { clients, stats, loading } = useCRM()
  const { currentOrganization } = useAuth()
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const clientsRef = useRef(clients)
  const statsRef = useRef(stats)
  clientsRef.current = clients
  statsRef.current = stats
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loadingReports, setLoadingReports] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  })
  const [selectedReport, setSelectedReport] = useState<'overview' | 'clients' | 'contracts' | 'tasks' | 'revenue'>('overview')
  const [revenuePeriod, setRevenuePeriod] = useState<'annual' | 'monthly' | 'predicted'>('monthly')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Handle URL parameters
  useEffect(() => {
    const sectionParam = searchParams.get('section')
    const periodParam = searchParams.get('period')
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')
    
    if (sectionParam === 'revenue') {
      setSelectedReport('revenue')
      
      if (periodParam === 'month') {
        setRevenuePeriod('monthly')
        if (monthParam) setSelectedMonth(parseInt(monthParam))
        if (yearParam) setSelectedYear(parseInt(yearParam))
        
        // Update date range for the selected month
        const year = parseInt(yearParam || new Date().getFullYear().toString())
        const month = parseInt(monthParam || new Date().getMonth().toString())
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)
        
        setDateRange({
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        })
      } else if (periodParam === 'annual') {
        setRevenuePeriod('annual')
      } else if (periodParam === 'predicted') {
        setRevenuePeriod('predicted')
      }
    }
  }, [searchParams])

  const buildReportData = (
    clientList: typeof clients,
    contracts: any[],
    tasks: any[],
    crmStats: typeof stats
  ): ReportData => {
    const totalClients = clientList.length
    const activeContracts = contracts.filter((c) => c.status === 'active').length
    const pendingTasks = tasks.filter((t) => t.status === 'pending').length
    const completedTasks = tasks.filter((t) => t.status === 'completed').length
    const totalTasks = tasks.length
    const taskCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const monthlyRevenue = contracts
      .filter((c) => c.status === 'active' && c.monthly_value)
      .reduce((sum, c) => sum + (c.monthly_value || 0), 0)

    return {
      clients: clientList,
      contracts,
      tasks,
      stats: {
        totalClients,
        activeContracts,
        pendingTasks,
        monthlyRevenue,
        clientGrowth: crmStats.client_change_percentage || 0,
        contractGrowth: crmStats.contract_change_percentage || 0,
        taskCompletion,
      },
    }
  }

  const fetchReportData = useCallback(async () => {
    const orgId = currentOrganization?.id
    if (!orgId) return

    setLoadingReports(true)
    setFetchError(null)

    try {
      const [contracts, tasks] = await Promise.all([
        withTimeout(ContractsService.getContracts(orgId)).catch(() => [] as any[]),
        withTimeout(TasksService.getTasks()).catch(() => [] as any[]),
      ])

      setReportData(buildReportData(clientsRef.current, contracts, tasks, statsRef.current))
    } catch (error) {
      console.error('Error fetching report data:', error)
      setFetchError(error instanceof Error ? error.message : 'Failed to load reports')
      setReportData(buildReportData(clientsRef.current, [], [], statsRef.current))
    } finally {
      setLoadingReports(false)
    }
  }, [currentOrganization?.id])

  // Revenue calculation functions
  const calculateAnnualRevenue = (contracts: any[]) => {
    const currentYear = new Date().getFullYear()
    const startOfYear = new Date(currentYear, 0, 1)
    const endOfYear = new Date(currentYear, 11, 31)
    
    return contracts
      .filter(contract => {
        const contractStart = new Date(contract.start_date)
        const contractEnd = contract.end_date ? new Date(contract.end_date) : endOfYear
        return contract.status === 'active' && 
               contractStart <= endOfYear && 
               contractEnd >= startOfYear
      })
      .reduce((total, contract) => {
        if (contract.monthly_value) {
          // Calculate how many months the contract is active in this year
          const contractStart = new Date(contract.start_date)
          const contractEnd = contract.end_date ? new Date(contract.end_date) : endOfYear
          const startMonth = Math.max(contractStart.getMonth(), 0)
          const endMonth = Math.min(contractEnd.getMonth(), 11)
          const activeMonths = endMonth - startMonth + 1
          return total + (contract.monthly_value * activeMonths)
        } else if (contract.value) {
          // One-time payment contracts
          return total + contract.value
        }
        return total
      }, 0)
  }

  const calculateMonthlyRevenue = (contracts: any[], month: number, year: number) => {
    const startOfMonth = new Date(year, month, 1)
    const endOfMonth = new Date(year, month + 1, 0)
    
    return contracts
      .filter(contract => {
        const contractStart = new Date(contract.start_date)
        const contractEnd = contract.end_date ? new Date(contract.end_date) : new Date(year + 1, 0, 1)
        return contract.status === 'active' && 
               contractStart <= endOfMonth && 
               contractEnd >= startOfMonth
      })
      .reduce((total, contract) => {
        if (contract.monthly_value) {
          // For monthly contracts, include if they're active during any part of the month
          return total + contract.monthly_value
        } else if (contract.value) {
          // For one-time payments, check if they start in this month
          const contractStart = new Date(contract.start_date)
          if (contractStart >= startOfMonth && contractStart <= endOfMonth) {
            return total + contract.value
          }
        }
        return total
      }, 0)
  }

  // Calculate revenue for a specific date range
  const calculateRevenueForDateRange = (contracts: any[], startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    return contracts
      .filter(contract => {
        const contractStart = new Date(contract.start_date)
        const contractEnd = contract.end_date ? new Date(contract.end_date) : new Date(end.getFullYear() + 1, 0, 1)
        return contract.status === 'active' && 
               contractStart <= end && 
               contractEnd >= start
      })
      .reduce((total, contract) => {
        if (contract.monthly_value) {
          // Calculate how many months the contract is active in this date range
          const contractStart = new Date(contract.start_date)
          const contractEnd = contract.end_date ? new Date(contract.end_date) : new Date(end.getFullYear() + 1, 0, 1)
          
          // Find the overlap between contract period and date range
          const overlapStart = new Date(Math.max(contractStart.getTime(), start.getTime()))
          const overlapEnd = new Date(Math.min(contractEnd.getTime(), end.getTime()))
          
          if (overlapStart <= overlapEnd) {
            // Calculate the number of months in the overlap
            const monthsDiff = (overlapEnd.getFullYear() - overlapStart.getFullYear()) * 12 + 
                              (overlapEnd.getMonth() - overlapStart.getMonth())
            
            // If the contract spans the entire date range, count full months
            if (overlapStart.getDate() === 1 && overlapEnd.getDate() >= 28) {
              return total + (contract.monthly_value * Math.max(1, monthsDiff + 1))
            } else {
              // Partial month - use proportional calculation or count as full month
              return total + contract.monthly_value
            }
          }
        } else if (contract.value) {
          // For one-time payments, check if they fall in the date range
          const contractStart = new Date(contract.start_date)
          if (contractStart >= start && contractStart <= end) {
            return total + contract.value
          }
        }
        return total
      }, 0)
  }

  const calculatePredictedRevenue = (contracts: any[]) => {
    const currentYear = new Date().getFullYear()
    const remainingMonths = 12 - new Date().getMonth()
    
    return contracts
      .filter(contract => contract.status === 'active' && contract.monthly_value)
      .reduce((total, contract) => {
        const contractEnd = contract.end_date ? new Date(contract.end_date) : new Date(currentYear + 1, 0, 1)
        const currentDate = new Date()
        const monthsUntilEnd = Math.max(0, Math.min(
          contractEnd.getMonth() - currentDate.getMonth() + 
          (contractEnd.getFullYear() - currentDate.getFullYear()) * 12,
          remainingMonths
        ))
        return total + (contract.monthly_value * monthsUntilEnd)
      }, 0)
  }

  useEffect(() => {
    setReportData(null)
    setFetchError(null)
  }, [currentOrganization?.id])

  useEffect(() => {
    if (!currentOrganization?.id || loading.clients) return
    fetchReportData()
  }, [currentOrganization?.id, loading.clients, fetchReportData])

return (
<RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('crm.reportsPage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('crm.reportsPage.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchReportData}
              disabled={loadingReports}
              className="flex items-center px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              {loadingReports ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {t('crm.reportsPage.refresh')}
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('crm.reportsPage.dateRange')}:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-700 dark:text-slate-100"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Report Navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex space-x-1">
              {reportTabs.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setSelectedReport(section.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedReport === section.id
                        ? 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t(section.labelKey)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Report Content */}
          <div className="p-6">
            {fetchError && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                {fetchError}. Showing available data.
              </div>
            )}
            {!reportData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mr-3" />
                <span className="text-gray-600 dark:text-gray-400">{t('crm.reportsPage.loading')}</span>
              </div>
            ) : (
              <>
                {/* Overview Report */}
                {selectedReport === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 rounded-lg text-white"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-100 text-sm">Total Clients</p>
                            <p className="text-3xl font-bold">{reportData?.stats?.totalClients || clients?.length || 0}</p>
                            <p className="text-blue-100 text-sm">
                              {reportData?.stats?.clientGrowth > 0 ? '+' : ''}{reportData?.stats?.clientGrowth || 0}% from last month
                            </p>
                          </div>
                          <Users className="w-12 h-12 text-blue-200" />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 p-6 rounded-lg text-white"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-100 text-sm">Active Contracts</p>
                            <p className="text-3xl font-bold">{reportData?.stats?.activeContracts || 0}</p>
                            <p className="text-green-100 text-sm">
                              {reportData?.stats?.contractGrowth > 0 ? '+' : ''}{reportData?.stats?.contractGrowth || 0}% from last month
                            </p>
                          </div>
                          <FileText className="w-12 h-12 text-green-200" />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 p-6 rounded-lg text-white"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-orange-100 text-sm">Pending Tasks</p>
                            <p className="text-3xl font-bold">{reportData?.stats?.pendingTasks || 0}</p>
                            <p className="text-orange-100 text-sm">
                              {reportData?.stats?.taskCompletion || 0}% completion rate
                            </p>
                          </div>
                          <CheckSquare className="w-12 h-12 text-orange-200" />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-r from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700 p-6 rounded-lg text-white"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-violet-100 text-sm">Monthly Revenue</p>
                            <p className="text-3xl font-bold">
                              ${(reportData?.stats?.monthlyRevenue || 0).toLocaleString()}
                            </p>
                            <p className="text-violet-100 text-sm">From active contracts</p>
                          </div>
                          <DollarSign className="w-12 h-12 text-violet-200" />
                        </div>
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-gray-50 dark:bg-slate-700 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                          Recent Activity Summary
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">New clients this month</span>
                            <span className="font-semibold text-gray-900 dark:text-slate-100">
                              {(reportData?.clients || clients || []).filter(c => 
                                new Date(c.createdAt) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                              ).length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Tasks completed</span>
                            <span className="font-semibold text-gray-900 dark:text-slate-100">
                              {(reportData?.tasks || []).filter(t => t.status === 'completed').length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Contracts signed</span>
                            <span className="font-semibold text-gray-900 dark:text-slate-100">
                              {(reportData?.contracts || []).filter(c => c.status === 'active').length}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-slate-700 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                          Export Overview Report
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Download a comprehensive overview of all your CRM metrics
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              const overviewData = [
                                { metric: 'Total Clients', value: reportData.stats.totalClients },
                                { metric: 'Active Contracts', value: reportData.stats.activeContracts },
                                { metric: 'Pending Tasks', value: reportData.stats.pendingTasks },
                                { metric: 'Monthly Revenue', value: `$${reportData.stats.monthlyRevenue.toLocaleString()}` },
                                { metric: 'Client Growth', value: `${reportData.stats.clientGrowth}%` },
                                { metric: 'Contract Growth', value: `${reportData.stats.contractGrowth}%` },
                                { metric: 'Task Completion Rate', value: `${reportData.stats.taskCompletion}%` },
                              ]
                              exportTableToExcel(overviewData, overviewExportColumns, 'overview_report', 'Overview')
                            }}
                            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Excel
                          </button>
                          <button
                            onClick={() => {
                              const overviewData = [
                                { metric: 'Total Clients', value: reportData.stats.totalClients },
                                { metric: 'Active Contracts', value: reportData.stats.activeContracts },
                                { metric: 'Pending Tasks', value: reportData.stats.pendingTasks },
                                { metric: 'Monthly Revenue', value: `$${reportData.stats.monthlyRevenue.toLocaleString()}` },
                                { metric: 'Client Growth', value: `${reportData.stats.clientGrowth}%` },
                                { metric: 'Contract Growth', value: `${reportData.stats.contractGrowth}%` },
                                { metric: 'Task Completion Rate', value: `${reportData.stats.taskCompletion}%` },
                              ]
                              exportTableToPDF(overviewData, overviewExportColumns, 'overview_report', 'CRM Overview Report')
                            }}
                            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Clients Report */}
                {selectedReport === 'clients' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        Client Report ({(reportData?.clients || clients || []).length} clients)
                      </h3>
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            exportTableToExcel(
                              reportData?.clients || clients || [],
                              clientReportColumns,
                              'clients_report',
                              'Clients'
                            )
                          }
                          className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Export Excel
                        </button>
                        <button
                          onClick={() =>
                            exportTableToPDF(
                              reportData?.clients || clients || [],
                              clientReportColumns,
                              'clients_report',
                              'Client Report'
                            )
                          }
                          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Export PDF
                        </button>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {(reportData?.clients || clients || []).slice(0, 20).map((client) => (
                              <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                                  {client.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  {client.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  {client.company}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  {client.phone}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(client.createdAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contracts Report */}
                {selectedReport === 'contracts' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        Contract Report ({(reportData?.contracts || []).length} contracts)
                      </h3>
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            exportTableToExcel(
                              reportData?.contracts || [],
                              contractReportColumns,
                              'contracts_report',
                              'Contracts'
                            )
                          }
                          className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Export Excel
                        </button>
                        <button
                          onClick={() =>
                            exportTableToPDF(
                              reportData?.contracts || [],
                              contractReportColumns,
                              'contracts_report',
                              'Contract Report'
                            )
                          }
                          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Export PDF
                        </button>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contract</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {(reportData?.contracts || []).slice(0, 20).map((contract) => (
                              <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                                  {contract.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  {contract.clients?.name || 'No client'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  {contract.type.replace('_', ' ')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    contract.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                                    contract.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                  }`}>
                                    {contract.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  ${(contract.monthly_value || contract.value || 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tasks Report */}
                {selectedReport === 'tasks' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        Task Report ({(reportData?.tasks || []).length} tasks)
                      </h3>
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            exportTableToExcel(
                              reportData?.tasks || [],
                              taskReportColumns,
                              'tasks_report',
                              'Tasks'
                            )
                          }
                          className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Export Excel
                        </button>
                        <button
                          onClick={() =>
                            exportTableToPDF(
                              reportData?.tasks || [],
                              taskReportColumns,
                              'tasks_report',
                              'Task Report'
                            )
                          }
                          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Export PDF
                        </button>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {(reportData?.tasks || []).slice(0, 20).map((task) => (
                              <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                                  {task.title}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  {task.client_name || 'No client'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  {task.task_type.replace('_', ' ')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
                                    task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200' :
                                    task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    task.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                                    task.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' :
                                    task.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                  }`}>
                                    {task.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Revenue Report */}
                {selectedReport === 'revenue' && (
                  <div className="space-y-6">
                    {/* Revenue Period Selection */}
                    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Revenue Period:</span>
                        <div className="flex space-x-1">
                          {revenuePeriods.map((period) => (
                            <button
                              key={period.id}
                              onClick={() => setRevenuePeriod(period.id)}
                              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                revenuePeriod === period.id
                                  ? 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600'
                              }`}
                            >
                              {t(period.labelKey)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Month/Year Selection for Monthly View */}
                      {revenuePeriod === 'monthly' && (
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Month:</span>
                          <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-700 dark:text-slate-100"
                          >
                            {Array.from({ length: 12 }, (_, i) => (
                              <option key={i} value={i}>
                                {new Date(0, i).toLocaleDateString('en-US', { month: 'long' })}
                              </option>
                            ))}
                          </select>
                          <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-700 dark:text-slate-100"
                          >
                            {Array.from({ length: 3 }, (_, i) => {
                              const year = new Date().getFullYear() - 1 + i
                              return (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              )
                            })}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Revenue Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {revenuePeriod === 'annual' && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Annual Revenue</p>
                              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(calculateAnnualRevenue(reportData.contracts))}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date().getFullYear()}
                              </p>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {revenuePeriod === 'monthly' && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Revenue</p>
                              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(calculateMonthlyRevenue(reportData.contracts, selectedMonth, selectedYear))}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Date Range: {dateRange.start} to {dateRange.end}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Includes contracts active during any part of the month
                              </p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {revenuePeriod === 'predicted' && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Predicted Revenue</p>
                              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(calculatePredictedRevenue(reportData.contracts))}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Remaining {12 - new Date().getMonth()} months
                              </p>
                            </div>
                            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Additional Metrics */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Contracts</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                              {reportData.contracts.filter(c => c.status === 'active').length}
                            </p>
                          </div>
                          <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                            <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Monthly Value</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(
                                reportData.contracts.filter(c => c.status === 'active' && c.monthly_value).length > 0
                                  ? reportData.contracts
                                      .filter(c => c.status === 'active' && c.monthly_value)
                                      .reduce((sum, c) => sum + c.monthly_value, 0) /
                                    reportData.contracts.filter(c => c.status === 'active' && c.monthly_value).length
                                  : 0
                              )}
                            </p>
                          </div>
                          <div className="p-3 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
</RoleGuard>
)
}