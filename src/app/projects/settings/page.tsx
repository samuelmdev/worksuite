'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Settings, FolderOpen, Users, Bell, Shield } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

export default function ProjectsSettingsPage() {
  const { t } = useLocale()

  const settingsSections: { id: string; titleKey: TranslationKey; descKey: TranslationKey; icon: typeof FolderOpen; color: string }[] = [
    {
      id: 'general',
      titleKey: 'projects.settingsPage.section.general',
      descKey: 'projects.settingsPage.section.generalDesc',
      icon: FolderOpen,
      color: 'violet'
    },
    {
      id: 'templates',
      titleKey: 'projects.settingsPage.section.templates',
      descKey: 'projects.settingsPage.section.templatesDesc',
      icon: FolderOpen,
      color: 'blue'
    },
    {
      id: 'notifications',
      titleKey: 'projects.settingsPage.section.notifications',
      descKey: 'projects.settingsPage.section.notificationsDesc',
      icon: Bell,
      color: 'orange'
    },
    {
      id: 'permissions',
      titleKey: 'projects.settingsPage.section.permissions',
      descKey: 'projects.settingsPage.section.permissionsDesc',
      icon: Shield,
      color: 'red'
    }
  ]

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('projects.settingsPage.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('projects.settingsPage.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsSections.map((section, index) => {
            const Icon = section.icon
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${
                    section.color === 'violet' ? 'bg-violet-200 dark:bg-violet-900' :
                    section.color === 'blue' ? 'bg-blue-200 dark:bg-blue-900' :
                    section.color === 'orange' ? 'bg-orange-200 dark:bg-orange-900' :
                    'bg-red-200 dark:bg-red-900'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      section.color === 'violet' ? 'text-violet-600 dark:text-violet-400' :
                      section.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                      section.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                      'text-red-600 dark:text-red-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
                      {t(section.titleKey)}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {t(section.descKey)}
                    </p>
                    <div className="flex items-center text-sm text-violet-600 dark:text-violet-400">
                      <span>{t('common.settings')}</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <div>
              <h3 className="text-lg font-semibold text-violet-900 dark:text-violet-100">
                {t('common.comingSoon')}
              </h3>
              <p className="text-violet-700 dark:text-violet-300 text-sm mt-1">
                {t('common.comingSoonDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
