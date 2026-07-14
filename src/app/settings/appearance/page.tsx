'use client'

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import SettingsSubpage from '../../components/SettingsSubpage'
import { SettingsCard } from '../../components/SettingsCard'
import { useTheme } from '../../lib/theme'
import { useLocale } from '../../lib/locale'

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useLocale()

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
      <SettingsSubpage titleKey="settings.section.appearance" descKey="settings.section.appearanceDesc">
        <SettingsCard title={t('settings.appearance.themeTitle')} description={t('settings.appearance.themeDesc')}>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                theme === 'light'
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                  : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-cyan-600' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('settings.appearance.light')}</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                theme === 'dark'
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                  : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
              }`}
            >
              <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-cyan-600' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{t('settings.appearance.dark')}</span>
            </button>
          </div>
        </SettingsCard>

        <SettingsCard title={t('settings.appearance.languageTitle')} description={t('settings.appearance.languageDesc')}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { code: 'en' as const, label: 'English', flag: '🇺🇸' },
              { code: 'fi' as const, label: 'Suomi', flag: '🇫🇮' },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLocale(lang.code)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  locale === lang.code
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{lang.label}</span>
              </button>
            ))}
          </div>
        </SettingsCard>
      </SettingsSubpage>
    </RoleGuard>
  )
}
