'use client'

import React from 'react'
import { useLocale } from '../../lib/locale'

export default function ProjectReportsPage() {
  const { t } = useLocale()

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white dark:bg-slate-800 rounded shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-100">{t('projects.reportsPage.title')}</h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('projects.reportsPage.subtitle')}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('projects.reportsPage.loading')}</span>
          <button className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white shape-sm text-sm transition-colors">
            {t('projects.reportsPage.export')}
          </button>
        </div>
      </div>
    </div>
  )
}
