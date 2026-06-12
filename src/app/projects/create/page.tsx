'use client'

import React from 'react'
import { useLocale } from '../../lib/locale'

export default function CreateProjectPage() {
  const { t } = useLocale()

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-100">{t('projects.createPage.title')}</h3>
      <p className="text-gray-600 dark:text-gray-400">
        {t('projects.createPage.subtitle')}
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded">
          <h4 className="font-semibold text-violet-800 dark:text-violet-200 mb-2">{t('projects.createPage.generalProject')}</h4>
          <p className="text-sm text-violet-700 dark:text-violet-300">{t('projects.createPage.generalDesc')}</p>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">{t('projects.createPage.routeProject')}</h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">{t('projects.createPage.routeDesc')}</p>
        </div>
      </div>
    </div>
  )
}
