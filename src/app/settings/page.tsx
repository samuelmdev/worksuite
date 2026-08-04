'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { User, Bell, Shield, Database, Palette, Building, Code, Download, CreditCard, Link as LinkIcon, Lock, Users, Plus, Trash2, Crown } from 'lucide-react'
import RoleGuard from '../components/RoleGuard'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

type SettingsSection = {
  titleKey: TranslationKey
  descKey: TranslationKey
  icon: typeof User
  color: string
  href: string
}

function getIconStyles(color: string) {
  const bg =
    color === 'blue' || color === 'cyan' ? 'bg-cyan-200 dark:bg-cyan-900' :
    color === 'green' || color === 'emerald' ? 'bg-green-200 dark:bg-green-900' :
    color === 'red' ? 'bg-red-200 dark:bg-red-900' :
    color === 'violet' ? 'bg-violet-200 dark:bg-violet-900' :
    color === 'orange' ? 'bg-orange-200 dark:bg-orange-900' :
    color === 'indigo' ? 'bg-indigo-200 dark:bg-indigo-900' :
    'bg-pink-200 dark:bg-pink-900'

  const text =
    color === 'blue' || color === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' :
    color === 'green' || color === 'emerald' ? 'text-green-600 dark:text-emerald-400' :
    color === 'red' ? 'text-red-600 dark:text-red-400' :
    color === 'violet' ? 'text-violet-600 dark:text-violet-400' :
    color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
    color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' :
    'text-pink-600 dark:text-pink-400'

  return { bg, text }
}

function SettingsLinkCard({ section, t }: { section: SettingsSection; t: (key: TranslationKey) => string }) {
  const Icon = section.icon
  const { bg, text } = getIconStyles(section.color)

  return (
    <Link href={section.href} className="block h-full">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-black/50 border border-gray-200 dark:border-slate-700 p-6 h-full transition-[box-shadow,border-color] duration-200 hover:shadow-lg dark:hover:shadow-black/30 hover:border-cyan-300 dark:hover:border-cyan-700 cursor-pointer">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${bg}`}>
            <Icon className={`w-6 h-6 ${text}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              {t(section.titleKey)}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t(section.descKey)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function SettingsPage() {
  const { user, currentOrganization } = useAuth()
  const { t } = useLocale()
  const [organizationUsers, setOrganizationUsers] = useState<any[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showNewOrgModal, setShowNewOrgModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const settingsSections: SettingsSection[] = [
    { titleKey: 'settings.section.profile', descKey: 'settings.section.profileDesc', icon: User, color: 'blue', href: '/settings/profile' },
    { titleKey: 'settings.section.notifications', descKey: 'settings.section.notificationsDesc', icon: Bell, color: 'green', href: '/settings/notifications' },
    { titleKey: 'settings.section.security', descKey: 'settings.section.securityDesc', icon: Shield, color: 'red', href: '/settings/security' },
    { titleKey: 'settings.section.appearance', descKey: 'settings.section.appearanceDesc', icon: Palette, color: 'violet', href: '/settings/appearance' },
    { titleKey: 'settings.section.billing', descKey: 'settings.section.billingDesc', icon: CreditCard, color: 'orange', href: '/settings/billing' },
    { titleKey: 'settings.section.integrations', descKey: 'settings.section.integrationsDesc', icon: LinkIcon, color: 'pink', href: '/settings/integrations' },
  ]

  const adminSettings: SettingsSection[] = [
    { titleKey: 'settings.section.userManagement', descKey: 'settings.section.userManagementDesc', icon: User, color: 'blue', href: '/settings/users' },
    { titleKey: 'settings.section.workspace', descKey: 'settings.section.workspaceDesc', icon: Building, color: 'cyan', href: '/settings/workspace' },
    { titleKey: 'settings.section.api', descKey: 'settings.section.apiDesc', icon: Code, color: 'emerald', href: '/settings/api' },
    { titleKey: 'settings.section.data', descKey: 'settings.section.dataDesc', icon: Database, color: 'orange', href: '/settings/data' },
    { titleKey: 'settings.section.backup', descKey: 'settings.section.backupDesc', icon: Download, color: 'indigo', href: '/settings/backup' },
    { titleKey: 'settings.section.privacy', descKey: 'settings.section.privacyDesc', icon: Lock, color: 'red', href: '/settings/privacy' },
  ]

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin': return t('settings.role.admin')
      case 'manager': return t('settings.role.manager')
      case 'member': return t('settings.role.member')
      default: return t('common.noOrganization')
    }
  }

  return (
    <RoleGuard>
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="border-l border-r border-slate-500/50 min-h-screen">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 pt-2">{t('settings.title')}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('settings.subtitle')}
              </p>
            </div>

            {/* Current Organization Info */}
            {currentOrganization && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
                      <Building className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        {currentOrganization.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('settings.currentOrg')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      currentOrganization.role === 'admin' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {currentOrganization.role === 'admin' ? (
                        <>
                          <Crown className="w-3 h-3 mr-1" />
                          {t('settings.role.admin')}
                        </>
                      ) : (
                        t('settings.role.member')
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* User Info */}
            {user && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-cyan-200 dark:bg-cyan-900 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      {user.name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                      currentOrganization?.role === 'admin' ? 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200' :
                      currentOrganization?.role === 'manager' ? 'bg-cyan-200 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200' :
                      'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
                    }`}>
                      {getRoleLabel(currentOrganization?.role)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* General Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                {t('settings.general')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settingsSections.map((section) => (
                  <SettingsLinkCard key={section.titleKey} section={section} t={t} />
                ))}
              </div>
            </div>

            {/* Admin Settings */}
            {currentOrganization?.role === 'admin' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                  {t('settings.admin')}
                </h2>
                
                {/* Organization Management */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                        {t('settings.orgManagement.title')}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('settings.orgManagement.desc')}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowNewOrgModal(true)}
                      className="flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('settings.orgManagement.newOrg')}
                    </motion.button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building className="w-5 h-5 text-violet-600" />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-slate-100">
                            {currentOrganization.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('settings.currentOrgShort')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Management */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                        {t('settings.team.title')}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('settings.team.desc')}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowAddUserModal(true)}
                      className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('settings.team.addUser')}
                    </motion.button>
                  </div>
                  
                  <div className="space-y-3">
                    {organizationUsers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          {t('settings.team.empty')}
                        </p>
                      </div>
                    ) : (
                      organizationUsers.map((orgUser) => (
                        <div key={orgUser.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-600 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-slate-100">
                                {orgUser.first_name} {orgUser.last_name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {orgUser.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <select 
                              value={orgUser.role}
                              className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                            >
                              <option value="member">{t('settings.role.member')}</option>
                              <option value="manager">{t('settings.role.manager')}</option>
                              <option value="admin">{t('settings.role.admin')}</option>
                            </select>
                            <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adminSettings.map((section) => (
                    <SettingsLinkCard key={section.titleKey} section={section} t={t} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              {t('settings.modal.addTeamMember')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('common.role')}
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100">
                  <option value="member">{t('settings.role.member')}</option>
                  <option value="manager">{t('settings.role.manager')}</option>
                  <option value="admin">{t('settings.role.admin')}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  // TODO: Implement add user logic
                  setShowAddUserModal(false)
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                {t('settings.team.addUser')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Organization Modal */}
      {showNewOrgModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              {t('settings.modal.createOrg')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.organizationName')}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  placeholder={t('settings.modal.orgNamePlaceholder')}
                />
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {t('settings.modal.newSubscriptionTitle')}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {t('settings.modal.newSubscriptionDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewOrgModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  // TODO: Implement new organization creation with subscription
                  setShowNewOrgModal(false)
                }}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                {t('settings.modal.createAndSubscribe')}
              </button>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  )
}