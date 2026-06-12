'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, Edit, Trash2, Calendar, Clock, User, CheckCircle, AlertCircle, Filter, Loader2, MoreHorizontal } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import TaskModal from '../../components/TaskModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { TasksService, Task } from '../../../lib/tasks-service'
import { useCRM } from '../../lib/crm-context'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

const taskTypes: { value: string; labelKey: TranslationKey; color: string }[] = [
  { value: 'call', labelKey: 'enum.taskType.call', color: 'text-blue-600' },
  { value: 'meeting', labelKey: 'enum.taskType.meeting', color: 'text-green-600' },
  { value: 'email', labelKey: 'enum.taskType.email', color: 'text-purple-600' },
  { value: 'follow_up', labelKey: 'enum.taskType.followUp', color: 'text-orange-600' },
  { value: 'proposal', labelKey: 'enum.taskType.proposal', color: 'text-indigo-600' },
  { value: 'contract_review', labelKey: 'enum.taskType.contractReview', color: 'text-red-600' },
  { value: 'other', labelKey: 'enum.taskType.other', color: 'text-gray-600' }
]

const priorities: { value: string; labelKey: TranslationKey; color: string }[] = [
  { value: 'low', labelKey: 'enum.priority.low', color: 'text-gray-500' },
  { value: 'medium', labelKey: 'enum.priority.medium', color: 'text-yellow-600' },
  { value: 'high', labelKey: 'enum.priority.high', color: 'text-orange-600' },
  { value: 'urgent', labelKey: 'enum.priority.urgent', color: 'text-red-600' }
]

const statuses: { value: string; labelKey: TranslationKey; color: string }[] = [
  { value: 'pending', labelKey: 'enum.taskStatus.pending', color: 'text-yellow-600' },
  { value: 'in_progress', labelKey: 'enum.taskStatus.inProgress', color: 'text-blue-600' },
  { value: 'completed', labelKey: 'enum.taskStatus.completed', color: 'text-green-600' },
  { value: 'cancelled', labelKey: 'enum.taskStatus.cancelled', color: 'text-gray-500' }
]

export default function CRMTasksPage() {
  const searchParams = useSearchParams()
  const { t } = useLocale()
  const { clients } = useCRM()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async (isRetry = false) => {
      try {
        if (!isRetry) {
          setLoading(true)
          setError(null)
        }
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
        
        const fetchedTasks = await Promise.race([
          TasksService.getTasks(),
          timeoutPromise
        ]) as Task[]
        
        setTasks(fetchedTasks)
        setRetryCount(0) // Reset retry count on success
      } catch (err) {
        console.error('Error fetching tasks:', err)
        if (err instanceof Error && err.message.includes('timeout')) {
          setError(t('common.error.timeout'))
        } else {
          setError(t('common.error.loadFailed'))
        }
        
        // Auto-retry once after a delay
        if (retryCount === 0) {
          setRetryCount(1)
          setTimeout(() => fetchTasks(true), 2000)
          return
        }
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  // Handle URL parameters
  useEffect(() => {
    const clientParam = searchParams.get('client')
    const statusParam = searchParams.get('status')
    
    if (clientParam) {
      setSearchTerm(decodeURIComponent(clientParam))
    }
    
    if (statusParam) {
      setFilterStatus(statusParam)
    }
  }, [searchParams])

  // Filter tasks
  useEffect(() => {
    let filtered = tasks

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus)
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(task => task.task_type === filterType)
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority)
    }

    setFilteredTasks(filtered)
  }, [tasks, searchTerm, filterStatus, filterType, filterPriority])

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDeleteTask = (task: Task) => {
    setSelectedTask(task)
    setIsDeleteDialogOpen(true)
  }

  const handleSaveTask = async (taskData: Task) => {
    try {
      setError(null)
      
      if (modalMode === 'create') {
        setTasks(prev => [taskData, ...prev])
      } else if (selectedTask) {
        setTasks(prev => prev.map(task => 
          task.id === selectedTask.id ? taskData : task
        ))
      }
      
      setIsModalOpen(false)
      setSelectedTask(null)
    } catch (err) {
      console.error('Error saving task:', err)
      setError(t('crm.tasksPage.error.save'))
    }
  }

  const handleConfirmDelete = async () => {
    if (selectedTask) {
      try {
        setError(null)
        await TasksService.deleteTask(selectedTask.id)
        setTasks(prev => prev.filter(task => task.id !== selectedTask.id))
        setIsDeleteDialogOpen(false)
        setSelectedTask(null)
      } catch (err) {
        console.error('Error deleting task:', err)
        setError(t('crm.tasksPage.error.delete'))
      }
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const updatedTask = await TasksService.updateTaskStatus(taskId, newStatus)
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ))
    } catch (err) {
      console.error('Error updating task status:', err)
      setError(t('crm.tasksPage.error.statusUpdate'))
    }
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    const priorityConfig = priorities.find(p => p.value === priority)
    return priorityConfig?.color || 'text-gray-500'
  }

  const getTaskTypeConfig = (type: Task['task_type']) => {
    return taskTypes.find(tt => tt.value === type) || { labelKey: 'enum.taskType.other' as TranslationKey, color: 'text-gray-600' }
  }

  const getStatusBorderColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'border-l-green-500'
      case 'in_progress':
        return 'border-l-blue-500'
      case 'cancelled':
        return 'border-l-gray-500'
      case 'pending':
      default:
        return 'border-l-yellow-500'
    }
  }

  const isOverdue = (dueDate: string, status: Task['status']) => {
    // Only show overdue for pending or in_progress tasks
    if (status === 'completed' || status === 'cancelled') {
      return false
    }
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('crm.tasksPage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('crm.tasksPage.subtitle')}
            </p>
            {error && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  disabled={loading}
                  className="text-xs px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('common.retrying') : t('common.retry')}
                </button>
              </div>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelectedTask(null)
              setModalMode('create')
              setIsModalOpen(true)
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('crm.tasksPage.add')}</span>
          </motion.button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('crm.tasksPage.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="all">{t('common.allStatuses')}</option>
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {t(status.labelKey)}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="all">{t('common.allTypes')}</option>
              {taskTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {t(type.labelKey)}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="all">{t('common.allPriorities')}</option>
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {t(priority.labelKey)}
                </option>
              ))}
            </select>

            {/* Results Count */}
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Filter className="w-4 h-4 mr-2" />
              {filteredTasks.length} of {tasks.length} tasks
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('crm.tasksPage.loading')}</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {searchTerm || filterStatus !== 'all' || filterType !== 'all' || filterPriority !== 'all'
                  ? t('crm.tasksPage.empty.filtered')
                  : t('crm.tasksPage.empty.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || filterStatus !== 'all' || filterType !== 'all' || filterPriority !== 'all'
                  ? t('crm.tasksPage.empty.filtered')
                  : t('crm.tasksPage.empty.desc')}
              </p>
              {!searchTerm && filterStatus === 'all' && filterType === 'all' && filterPriority === 'all' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedTask(null)
                    setModalMode('create')
                    setIsModalOpen(true)
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                  {t('crm.tasksPage.add')}
                </motion.button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-l-4 ${getStatusBorderColor(task.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(task.status)}
                        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 truncate">
                          {task.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)} bg-opacity-10`}>
                          {t(priorities.find(p => p.value === task.priority)?.labelKey ?? 'enum.priority.medium')}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTaskTypeConfig(task.task_type).color} bg-opacity-10`}>
                          {t(getTaskTypeConfig(task.task_type).labelKey)}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        {task.client_name && (
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{task.client_name}</span>
                          </div>
                        )}
                        
                        {task.due_date && (
                          <div className={`flex items-center space-x-1 ${isOverdue(task.due_date, task.status) ? 'text-red-600' : ''}`}>
                            <Calendar className="w-4 h-4" />
                            <span>
                              {task.is_scheduled 
                                ? new Date(task.due_date).toLocaleString()
                                : new Date(task.due_date).toLocaleDateString()
                              }
                              {isOverdue(task.due_date, task.status) && ` (${t('common.overdue')})`}
                            </span>
                          </div>
                        )}

                        {task.is_scheduled && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                              {t('common.scheduled')}
                            </span>
                          </div>
                        )}

                        <span>
                          Created {new Date(task.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {/* Status Dropdown */}
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                        className="px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      >
                        {statuses.map(status => (
                          <option key={status.value} value={status.value}>
                            {t(status.labelKey)}
                          </option>
                        ))}
                      </select>

                      {/* Actions */}
                      <div className="flex items-center space-x-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEditTask(task)}
                          className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteTask(task)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>

                        {/* Calendar Integration Button */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            // TODO: Implement calendar integration
                            console.log('Add to calendar:', task)
                          }}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Add to Google Calendar/Outlook"
                        >
                          <Calendar className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Task Modal */}
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedTask(null)
          }}
          onSave={handleSaveTask}
          task={selectedTask}
          clients={clients as any}
          mode={modalMode}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false)
            setSelectedTask(null)
          }}
          onConfirm={handleConfirmDelete}
          title={t('crm.tasksPage.delete.title')}
          message={t('crm.tasksPage.delete.message', { title: selectedTask?.title ?? '' })}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
        />
      </div>
    </RoleGuard>
  )
}
