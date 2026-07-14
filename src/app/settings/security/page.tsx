'use client'

import React, { useState } from 'react'
import { Smartphone, Monitor } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import SettingsSubpage from '../../components/SettingsSubpage'
import { SettingsCard, SettingsField, SettingsToggle, inputClass } from '../../components/SettingsCard'
import { useLocale } from '../../lib/locale'

export default function SecuritySettingsPage() {
  const { t } = useLocale()
  const [twoFactor, setTwoFactor] = useState(false)
  const [loginAlerts, setLoginAlerts] = useState(true)

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
      <SettingsSubpage titleKey="settings.section.security" descKey="settings.section.securityDesc">
        <SettingsCard title={t('settings.security.passwordTitle')}>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <SettingsField label={t('settings.security.currentPassword')}>
              <input type="password" className={inputClass} placeholder="••••••••" />
            </SettingsField>
            <SettingsField label={t('settings.security.newPassword')}>
              <input type="password" className={inputClass} placeholder="••••••••" />
            </SettingsField>
            <SettingsField label={t('settings.security.confirmPassword')}>
              <input type="password" className={inputClass} placeholder="••••••••" />
            </SettingsField>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('settings.security.updatePassword')}
            </button>
          </form>
        </SettingsCard>

        <SettingsCard title={t('settings.security.twoFactorTitle')}>
          <SettingsToggle
            label={t('settings.security.enable2fa')}
            description={t('settings.security.enable2faDesc')}
            checked={twoFactor}
            onChange={setTwoFactor}
          />
          {twoFactor && (
            <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{t('settings.security.2faSetupHint')}</p>
            </div>
          )}
        </SettingsCard>

        <SettingsCard title={t('settings.security.sessionsTitle')}>
          <SettingsToggle
            label={t('settings.security.loginAlerts')}
            description={t('settings.security.loginAlertsDesc')}
            checked={loginAlerts}
            onChange={setLoginAlerts}
          />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-600">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('settings.security.currentSession')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Linux · Chrome · {t('settings.security.activeNow')}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                {t('settings.security.activeNow')}
              </span>
            </div>
          </div>
        </SettingsCard>
      </SettingsSubpage>
    </RoleGuard>
  )
}
