'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Settings, User, Bell, Shield, Database, X, Save, AlertCircle, CheckCircle, Trash2, Mail, Phone, Calendar, Lock, Download, Upload, Eye, EyeOff, ChevronDown, Activity, Clock, UserPlus } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { activityService } from '../../../lib/activity-service'
import { ClientService } from '../../../lib/client-service-multi-org'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'manager' | 'employee'
  crm_access: boolean
  created_at: string
  last_login?: string
}

interface NotificationSettings {
  email_notifications: boolean
  task_reminders: boolean
  contract_expiry_alerts: boolean
  client_activity_notifications: boolean
  weekly_reports: boolean
  daily_digest: boolean
}

interface SecuritySettings {
  two_factor_auth: boolean
  session_timeout: number
  password_policy: {
    min_length: number
    require_special_chars: boolean
    require_numbers: boolean
    require_uppercase: boolean
  }
  ip_whitelist: string[]
  audit_logging: boolean
}

export default function CRMSettingsPage() {
  const { user: currentUser, currentOrganization } = useAuth()
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [userActivities, setUserActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [grantUserId, setGrantUserId] = useState('')
  const [grantingAccess, setGrantingAccess] = useState(false)

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    task_reminders: true,
    contract_expiry_alerts: true,
    client_activity_notifications: false,
    weekly_reports: true,
    daily_digest: false
  })

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    two_factor_auth: false,
    session_timeout: 30,
    password_policy: {
      min_length: 8,
      require_special_chars: true,
      require_numbers: true,
      require_uppercase: true
    },
    ip_whitelist: [],
    audit_logging: true
  })

  const settingsSections: { id: string; titleKey: TranslationKey; description: string; icon: typeof User; color: string }[] = [
    {
      id: 'users',
      titleKey: 'crm.settingsPage.section.users',
      description: 'Manage user roles and CRM access permissions',
      icon: User,
      color: 'blue'
    },
    {
      id: 'notifications',
      titleKey: 'crm.settingsPage.section.notifications',
      description: 'Configure email and system notifications',
      icon: Bell,
      color: 'green'
    },
    {
      id: 'security',
      titleKey: 'crm.settingsPage.section.security',
      description: 'Security settings and access controls',
      icon: Shield,
      color: 'red'
    },
    {
      id: 'data',
      titleKey: 'crm.settingsPage.section.data',
      description: 'Backup, export, and data management',
      icon: Database,
      color: 'purple'
    }
  ]

  // Handle URL parameters
  useEffect(() => {
    const sectionParam = searchParams.get('section')
    if (sectionParam && ['users', 'notifications', 'security', 'data'].includes(sectionParam)) {
      setActiveSection(sectionParam)
    }
  }, [searchParams])

  // Fetch users and activities
  useEffect(() => {
    if (activeSection === 'users' && currentOrganization?.id) {
      fetchUsers()
      loadUserActivities()
    }
  }, [activeSection, currentOrganization?.id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen) {
        const target = event.target as Element
        if (!target.closest('.dropdown-container')) {
          setIsDropdownOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const fetchUsers = async () => {
    if (!currentOrganization?.id) {
      setUsers([])
      return
    }

    try {
      setLoading(true)
      const data = await ClientService.getUsers(currentOrganization.id)
      setUsers(
        data.map((member) => ({
          id: member.id,
          email: member.email || '',
          first_name: member.first_name || '',
          last_name: member.last_name || '',
          role: member.role,
          crm_access: member.role === 'admin' || member.role === 'manager',
          created_at: member.created_at,
          last_login: member.last_login_at,
        }))
      )
    } catch (err) {
      setError('Failed to fetch users')
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGrantAccess = async () => {
    if (!currentOrganization?.id || !grantUserId) return

    try {
      setGrantingAccess(true)
      await ClientService.grantCrmAccess(grantUserId, currentOrganization.id)
      setShowGrantModal(false)
      setGrantUserId('')
      setSuccess(t('crm.settingsPage.grantAccessSuccess'))
      await fetchUsers()
    } catch (err) {
      setError('Failed to grant CRM access')
      console.error('Error granting CRM access:', err)
    } finally {
      setGrantingAccess(false)
    }
  }

  const handleRevokeAccess = async (userId: string) => {
    if (!currentOrganization?.id) return

    try {
      await ClientService.revokeCrmAccess(userId, currentOrganization.id)
      setSuccess(t('crm.settingsPage.revokeAccessSuccess'))
      await fetchUsers()
    } catch (err) {
      setError('Failed to revoke CRM access')
      console.error('Error revoking CRM access:', err)
    }
  }

  const saveNotificationSettings = async () => {
    try {
      setLoading(true)
      // Save to user preferences or organization settings
      setSuccess(t('crm.settingsPage.saved'))
    } catch (err) {
      setError('Failed to save notification settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSecuritySettings = async () => {
    try {
      setLoading(true)
      // Save security settings
      setSuccess(t('crm.settingsPage.saved'))
    } catch (err) {
      setError('Failed to save security settings')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (type: 'clients' | 'contracts' | 'tasks' | 'all') => {
    try {
      setLoading(true)
      // Implement data export functionality
      setSuccess(`Data export for ${type} initiated`)
    } catch (err) {
      setError('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const loadUserActivities = async () => {
    try {
      setLoadingActivities(true)
      const activities = await activityService.getAllRecentActivities(50)
      setUserActivities(activities)
    } catch (err) {
      console.error('Error loading user activities:', err)
      setError('Failed to load user activities')
    } finally {
      setLoadingActivities(false)
    }
  }

  const renderUserManagement = () => {
    const isOrgAdmin = currentOrganization?.role === 'admin'
    const employeesWithoutCrm = users.filter((member) => member.role === 'employee')

    const getRoleBadgeClass = (role: User['role']) => {
      switch (role) {
        case 'admin':
          return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
        case 'manager':
          return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400'
        default:
          return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }
    }

    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{t('crm.settingsPage.section.users')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('crm.settingsPage.grantAccessDesc')}
          </p>
        </div>
        {isOrgAdmin && (
          <button
            onClick={() => {
              setGrantUserId('')
              setShowGrantModal(true)
            }}
            disabled={employeesWithoutCrm.length === 0}
            className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t('crm.settingsPage.grantAccess')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('common.loading')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('common.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    CRM Access
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {users.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                              {member.first_name?.[0]}{member.last_name?.[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {member.first_name} {member.last_name}
                          </div>
                          {member.email && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {member.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeClass(member.role)}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {member.role === 'admin' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                            {t('crm.settingsPage.crmAccess.default')}
                          </span>
                        )}
                        {member.role === 'manager' && (
                          <>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400">
                              {t('crm.settingsPage.crmAccess.granted')}
                            </span>
                            {isOrgAdmin && member.id !== currentUser?.id && (
                              <button
                                onClick={() => handleRevokeAccess(member.id)}
                                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                {t('crm.settingsPage.revokeAccess')}
                              </button>
                            )}
                          </>
                        )}
                        {member.role === 'employee' && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {t('crm.settingsPage.crmAccess.none')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Activity Logs */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-cyan-600 dark:text-cyan-400" />
            User Activity Logs
          </h3>
          <button 
            onClick={loadUserActivities}
            className="px-3 py-1 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {loadingActivities ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Loading activities...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
            {userActivities.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No user activities found</p>
                <p className="text-sm mt-1">User activities will appear here as actions are performed</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
                {userActivities.map((activity, index) => {
                  const getActivityIcon = (action: string) => {
                    switch (action) {
                      case 'created': return '➕'
                      case 'updated': return '✏️'
                      case 'deleted': return '🗑️'
                      case 'approved': return '✅'
                      case 'rejected': return '❌'
                      case 'submitted': return '📤'
                      case 'call_made': return '📞'
                      case 'call_received': return '📞'
                      case 'email_sent': return '📧'
                      case 'email_received': return '📧'
                      case 'meeting_scheduled': return '🤝'
                      case 'meeting_completed': return '🤝'
                      case 'meeting_cancelled': return '❌'
                      case 'proposal_sent': return '📋'
                      case 'contract_signed': return '📝'
                      case 'follow_up_scheduled': return '⏰'
                      default: return '📋'
                    }
                  }
                  
                  return (
                    <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-lg">
                          {getActivityIcon(activity.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {activity.title}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {activityService.formatTimeAgo(activity.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {activityService.getUserDisplayName(activity.user)} • {activity.module} • {activity.entity_type}
                          </p>
                          {activity.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {t('crm.settingsPage.grantAccessTitle')}
              </h3>
              <button
                onClick={() => setShowGrantModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('crm.settingsPage.grantAccessDesc')}
              </p>
              {employeesWithoutCrm.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('crm.settingsPage.grantAccessEmpty')}
                </p>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {t('crm.settingsPage.grantAccessSelect')}
                  </label>
                  <select
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <option value="">{t('crm.settingsPage.grantAccessSelect')}</option>
                    {employeesWithoutCrm.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => setShowGrantModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleGrantAccess}
                disabled={!grantUserId || grantingAccess}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 rounded-lg transition-colors"
              >
                {grantingAccess ? t('common.loading') : t('crm.settingsPage.grantAccess')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    )
  }

  const renderNotifications = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{t('crm.settingsPage.section.notifications')}</h2>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Email Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive email notifications for important events</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notificationSettings.email_notifications}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, email_notifications: e.target.checked }))}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Task Reminders</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get reminded about upcoming tasks and deadlines</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notificationSettings.task_reminders}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, task_reminders: e.target.checked }))}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Contract Expiry Alerts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Notifications when contracts are about to expire</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notificationSettings.contract_expiry_alerts}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, contract_expiry_alerts: e.target.checked }))}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Client Activity Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Notifications for client interactions and updates</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notificationSettings.client_activity_notifications}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, client_activity_notifications: e.target.checked }))}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Weekly Reports</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive weekly summary reports</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notificationSettings.weekly_reports}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, weekly_reports: e.target.checked }))}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Daily Digest</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Daily summary of activities and updates</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notificationSettings.daily_digest}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, daily_digest: e.target.checked }))}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={saveNotificationSettings}
            disabled={loading}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2 inline" />
            {t('crm.settingsPage.save')}
          </button>
        </div>
      </div>
    </div>
  )

  const renderSecurity = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{t('crm.settingsPage.section.security')}</h2>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={securitySettings.two_factor_auth}
                onChange={(e) => setSecuritySettings(prev => ({ ...prev, two_factor_auth: e.target.checked }))}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              value={securitySettings.session_timeout}
              onChange={(e) => setSecuritySettings(prev => ({ ...prev, session_timeout: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              min="5"
              max="480"
            />
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Password Policy</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Length
                </label>
                <input
                  type="number"
                  value={securitySettings.password_policy.min_length}
                  onChange={(e) => setSecuritySettings(prev => ({ 
                    ...prev, 
                    password_policy: { ...prev.password_policy, min_length: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
                  min="6"
                  max="32"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={securitySettings.password_policy.require_special_chars}
                    onChange={(e) => setSecuritySettings(prev => ({ 
                      ...prev, 
                      password_policy: { ...prev.password_policy, require_special_chars: e.target.checked }
                    }))}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-slate-100">Require special characters</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={securitySettings.password_policy.require_numbers}
                    onChange={(e) => setSecuritySettings(prev => ({ 
                      ...prev, 
                      password_policy: { ...prev.password_policy, require_numbers: e.target.checked }
                    }))}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-slate-100">Require numbers</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={securitySettings.password_policy.require_uppercase}
                    onChange={(e) => setSecuritySettings(prev => ({ 
                      ...prev, 
                      password_policy: { ...prev.password_policy, require_uppercase: e.target.checked }
                    }))}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-slate-100">Require uppercase letters</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Audit Logging</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Log all user activities for security monitoring</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={securitySettings.audit_logging}
                onChange={(e) => setSecuritySettings(prev => ({ ...prev, audit_logging: e.target.checked }))}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={saveSecuritySettings}
            disabled={loading}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2 inline" />
            {t('crm.settingsPage.save')}
          </button>
        </div>
      </div>
    </div>
  )

  const renderDataManagement = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{t('crm.settingsPage.section.data')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Export Data</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Export your CRM data for backup or analysis purposes
          </p>
          <div className="space-y-2">
            <button
              onClick={() => exportData('clients')}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Clients
            </button>
            <button
              onClick={() => exportData('contracts')}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Contracts
            </button>
            <button
              onClick={() => exportData('tasks')}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Tasks
            </button>
            <button
              onClick={() => exportData('all')}
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All Data
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Data Backup</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Create automated backups of your CRM data
          </p>
          <div className="space-y-2">
            <button
              disabled={loading}
              className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Create Backup
            </button>
            <button
              disabled={loading}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Backups
            </button>
          </div>
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
          These actions are irreversible. Please proceed with caution.
        </p>
        <button
          disabled={loading}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4 mr-2 inline" />
          Delete All Data
        </button>
      </div>
    </div>
  )

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('crm.settingsPage.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('crm.settingsPage.subtitle')}
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          </div>
        )}

        {/* Settings Navigation */}
        <div className="relative">
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            {/* Sections Overview Button */}
            <button
              onClick={() => setActiveSection(null)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !activeSection
                  ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Sections</span>
            </button>

            {/* Individual Section Buttons */}
            {settingsSections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t(section.titleKey)}</span>
                </button>
              )
            })}
          </div>

          {/* Mobile Dropdown */}
          <div className="md:hidden dropdown-container">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {activeSection ? (
                  <>
                    {(() => {
                      const section = settingsSections.find(s => s.id === activeSection)
                      const Icon = section?.icon || Settings
                      return <Icon className="w-4 h-4" />
                    })()}
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {activeSection ? t(settingsSections.find(s => s.id === activeSection)!.titleKey) : t('common.settings')}
                    </span>
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {t('common.settings')}
                    </span>
                  </>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10"
              >
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveSection(null)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                      !activeSection ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm font-medium">All Sections</span>
                  </button>
                  
                  {settingsSections.map((section) => {
                    const Icon = section.icon
                    return (
                      <button
                        key={section.id}
                        onClick={() => {
                          setActiveSection(activeSection === section.id ? null : section.id)
                          setIsDropdownOpen(false)
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                          activeSection === section.id ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{t(section.titleKey)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{section.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Settings Content */}
        {activeSection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            {activeSection === 'users' && renderUserManagement()}
            {activeSection === 'notifications' && renderNotifications()}
            {activeSection === 'security' && renderSecurity()}
            {activeSection === 'data' && renderDataManagement()}
          </motion.div>
        )}

        {/* Default View - Settings Grid */}
        {!activeSection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {settingsSections.map((section, index) => {
              const Icon = section.icon
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setActiveSection(section.id)}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${
                      section.color === 'blue' ? 'bg-cyan-200 dark:bg-cyan-900' :
                      section.color === 'green' ? 'bg-green-200 dark:bg-green-900' :
                      section.color === 'red' ? 'bg-red-200 dark:bg-red-900' :
                      'bg-violet-200 dark:bg-violet-900'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        section.color === 'blue' ? 'text-cyan-600 dark:text-cyan-400' :
                        section.color === 'green' ? 'text-green-600 dark:text-green-400' :
                        section.color === 'red' ? 'text-red-600 dark:text-red-400' :
                        'text-violet-600 dark:text-violet-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
                        {t(section.titleKey)}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
