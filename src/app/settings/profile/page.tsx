'use client'

import React, { useState } from 'react'
import { User, Mail } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import SettingsSubpage from '../../components/SettingsSubpage'
import { SettingsCard, SettingsField, inputClass } from '../../components/SettingsCard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { useLocale } from '../../lib/locale'

export default function ProfileSettingsPage() {
  const { user, currentOrganization } = useAuth()
  const { t } = useLocale()
  const [saved, setSaved] = useState(false)

  const nameParts = (user?.name || '').split(' ')
  const [firstName, setFirstName] = useState(nameParts[0] || '')
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('Europe/Helsinki')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <RoleGuard>
      <SettingsSubpage titleKey="settings.section.profile" descKey="settings.section.profileDesc">
        <SettingsCard>
          <div className="flex items-center space-x-4 pb-4 border-b border-gray-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{user?.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {currentOrganization?.role || t('common.noOrganization')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingsField label={t('settings.profile.firstName')}>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
              </SettingsField>
              <SettingsField label={t('settings.profile.lastName')}>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
              </SettingsField>
            </div>

            <SettingsField label={t('auth.email')}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className={`${inputClass} pl-10 opacity-70 cursor-not-allowed`}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.profile.emailReadonly')}</p>
            </SettingsField>

            <SettingsField label={t('settings.profile.phone')}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+358 40 123 4567"
                className={inputClass}
              />
            </SettingsField>

            <SettingsField label={t('settings.profile.timezone')}>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={inputClass}
              >
                <option value="Europe/Helsinki">Europe/Helsinki (EET)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="UTC">UTC</option>
              </select>
            </SettingsField>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white shape-sm font-medium transition-colors"
              >
                {t('common.save')}
              </button>
              {saved && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">{t('settings.mock.saved')}</span>
              )}
            </div>
          </form>
        </SettingsCard>
      </SettingsSubpage>
    </RoleGuard>
  )
}
