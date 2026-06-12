'use client'

import React from 'react'
import { useLocale } from '../../lib/locale'

export default function ProjectTemplatesPage() {
  const { t } = useLocale()

  const features = [
    'projects.templatesPage.feature1',
    'projects.templatesPage.feature2',
    'projects.templatesPage.feature3',
    'projects.templatesPage.feature4',
    'projects.templatesPage.feature5',
    'projects.templatesPage.feature6',
    'projects.templatesPage.feature7',
  ] as const

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white dark:bg-slate-800 rounded shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-100">{t('projects.templatesPage.title')}</h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('projects.templatesPage.subtitle')}
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {features.map((key) => (
            <li key={key}>• {t(key)}</li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-800 rounded shadow">
          <h4 className="font-semibold mb-2 text-gray-900 dark:text-slate-100">{t('projects.templatesPage.standardTemplates')}</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('projects.templatesPage.standardDesc')}
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 rounded shadow">
          <h4 className="font-semibold mb-2 text-gray-900 dark:text-slate-100">{t('projects.templatesPage.customTemplates')}</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('projects.templatesPage.customDesc')}
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 rounded shadow">
          <h4 className="font-semibold mb-2 text-gray-900 dark:text-slate-100">{t('projects.templatesPage.templateBuilder')}</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('projects.templatesPage.builderDesc')}
          </p>
        </div>
      </div>

      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">{t('projects.templatesPage.fullSuiteTitle')}</h4>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">
          {t('projects.templatesPage.fullSuiteDesc')}
        </p>
      </div>
    </div>
  )
}
