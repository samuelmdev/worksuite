'use client'

import React from 'react'
import RoleGuard from '../../components/RoleGuard'
import { useLocale } from '../../lib/locale'

export default function BillingSettingsPage() {
  const { t } = useLocale()

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('billing.settings.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('billing.settings.subtitle')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 shape-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">{t('common.comingSoonDesc')}</p>
        </div>
      </div>
    </RoleGuard>
  )
}
