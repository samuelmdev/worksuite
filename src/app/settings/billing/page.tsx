'use client'

import React from 'react'
import { CreditCard, CheckCircle } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import SettingsSubpage from '../../components/SettingsSubpage'
import { SettingsCard } from '../../components/SettingsCard'
import { useLocale } from '../../lib/locale'

export default function SubscriptionBillingPage() {
  const { t } = useLocale()

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
      <SettingsSubpage titleKey="settings.section.billing" descKey="settings.section.billingDesc" maxWidth="3xl">
        <SettingsCard title={t('settings.subscription.currentPlan')}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40 border border-cyan-200 dark:border-cyan-800">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.subscription.planLabel')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">WorkSuite</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('settings.subscription.planIncludes')}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-3xl font-black text-gray-900 dark:text-slate-100">€149<span className="text-base font-normal text-gray-500">/mo</span></p>
              <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CheckCircle className="w-3 h-3" />
                {t('settings.subscription.active')}
              </span>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {(['settings.subscription.feature1', 'settings.subscription.feature2', 'settings.subscription.feature3'] as const).map((key) => (
              <li key={key} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle className="w-4 h-4 text-cyan-500 shrink-0" />
                {t(key)}
              </li>
            ))}
          </ul>
        </SettingsCard>

        <SettingsCard title={t('settings.subscription.paymentMethod')}>
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Visa ···· 4242</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.subscription.expires')} 12/2027</p>
              </div>
            </div>
            <button
              type="button"
              className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              {t('settings.subscription.updatePayment')}
            </button>
          </div>
        </SettingsCard>

        <SettingsCard title={t('settings.subscription.usageTitle')}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('settings.subscription.seatsUsed')}</span>
              <span className="font-medium text-gray-900 dark:text-slate-100">3 / 5</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full w-3/5 bg-cyan-500 rounded-full" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.subscription.seatsNote')}</p>
          </div>
        </SettingsCard>
      </SettingsSubpage>
    </RoleGuard>
  )
}
