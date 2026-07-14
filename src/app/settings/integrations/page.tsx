'use client'

import React, { useState } from 'react'
import { Plug, ExternalLink } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import SettingsSubpage from '../../components/SettingsSubpage'
import { SettingsCard } from '../../components/SettingsCard'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

const integrations: {
  id: string
  nameKey: TranslationKey
  descKey: TranslationKey
  color: string
  connected: boolean
}[] = [
  { id: 'slack', nameKey: 'settings.integrations.slack', descKey: 'settings.integrations.slackDesc', color: 'purple', connected: false },
  { id: 'google', nameKey: 'settings.integrations.google', descKey: 'settings.integrations.googleDesc', color: 'blue', connected: true },
  { id: 'stripe', nameKey: 'settings.integrations.stripe', descKey: 'settings.integrations.stripeDesc', color: 'indigo', connected: false },
  { id: 'quickbooks', nameKey: 'settings.integrations.quickbooks', descKey: 'settings.integrations.quickbooksDesc', color: 'green', connected: false },
  { id: 'zapier', nameKey: 'settings.integrations.zapier', descKey: 'settings.integrations.zapierDesc', color: 'orange', connected: false },
]

export default function IntegrationsSettingsPage() {
  const { t } = useLocale()
  const [connected, setConnected] = useState<Record<string, boolean>>(
    Object.fromEntries(integrations.map((i) => [i.id, i.connected]))
  )

  const toggle = (id: string) => {
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
      <SettingsSubpage titleKey="settings.section.integrations" descKey="settings.section.integrationsDesc" maxWidth="3xl">
        <SettingsCard title={t('settings.integrations.available')} description={t('settings.integrations.availableDesc')}>
          <div className="space-y-3">
            {integrations.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <Plug className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t(item.nameKey)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t(item.descKey)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    connected[item.id]
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                      : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  }`}
                >
                  {connected[item.id] ? (
                    t('settings.integrations.connected')
                  ) : (
                    <>
                      {t('settings.integrations.connect')}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </SettingsCard>
      </SettingsSubpage>
    </RoleGuard>
  )
}
