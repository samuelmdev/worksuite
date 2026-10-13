'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Settings, Clock, DollarSign, Bell, Shield } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

export default function TimeTrackingSettingsPage() {
  const { t } = useLocale()

  const settingsSections: { id: string; titleKey: TranslationKey; descKey: TranslationKey; icon: typeof Clock; color: string }[] = [
    {
      id: 'time-tracking',
      titleKey: 'time.settingsPage.section.timeTracking',
      descKey: 'time.settingsPage.section.timeTrackingDesc',
      icon: Clock,
      color: 'cyan'
    },
    {
      id: 'billing',
      titleKey: 'time.settingsPage.section.billing',
      descKey: 'time.settingsPage.section.billingDesc',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      id: 'notifications',
      titleKey: 'time.settingsPage.section.notifications',
      descKey: 'time.settingsPage.section.notificationsDesc',
      icon: Bell,
      color: 'violet'
    },
    {
      id: 'permissions',
      titleKey: 'time.settingsPage.section.permissions',
      descKey: 'time.settingsPage.section.permissionsDesc',
      icon: Shield,
      color: 'red'
    }
  ]

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('time.settingsPage.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('time.settingsPage.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsSections.map((section, index) => {
            const Icon = section.icon
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 shape-sm ${
                    section.color === 'cyan' ? 'bg-cyan-200 dark:bg-cyan-900' :
                    section.color === 'emerald' ? 'bg-emerald-200 dark:bg-emerald-900' :
                    section.color === 'green' ? 'bg-green-200 dark:bg-green-900' :
                    section.color === 'violet' ? 'bg-violet-200 dark:bg-violet-900' :
                    'bg-red-200 dark:bg-red-900'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      section.color === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' :
                      section.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                      section.color === 'green' ? 'text-green-600 dark:text-green-400' :
                      section.color === 'violet' ? 'text-violet-600 dark:text-violet-400' :
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
                    <div className="flex items-center text-sm text-cyan-600 dark:text-cyan-400">
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

        <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 shape-sm p-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h3 className="text-lg font-semibold text-cyan-900 dark:text-cyan-100">
                {t('common.comingSoon')}
              </h3>
              <p className="text-cyan-700 dark:text-cyan-300 text-sm mt-1">
                {t('common.comingSoonDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
