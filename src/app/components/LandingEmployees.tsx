'use client'

import React from 'react'
import Link from 'next/link'
import { Building2, Users, LogIn, Clock, FolderKanban } from 'lucide-react'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

export default function LandingEmployees() {
  const { t } = useLocale()

  const modules = [
    {
      icon: Clock,
      color: 'emerald',
      nameKey: 'nav.timeTracking' as TranslationKey,
      descKey: 'landing.employeesTimeDesc' as TranslationKey,
      itemKeys: ['landing.timeItem1', 'landing.timeItem2', 'landing.timeItem3', 'landing.employeesTimeItem4'] as TranslationKey[],
    },
    {
      icon: FolderKanban,
      color: 'violet',
      nameKey: 'nav.projects' as TranslationKey,
      descKey: 'landing.employeesProjectsDesc' as TranslationKey,
      itemKeys: ['landing.projectsItem1', 'landing.projectsItem2', 'landing.projectsItem3', 'landing.employeesProjectsItem4'] as TranslationKey[],
    },
  ]

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="px-4 sm:px-6 lg:px-8 py-3 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Users className="w-4 h-4" />
            {t('landing.forEmployees')}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              {t('landing.backToHome')}
            </Link>
            <Link href="/?view=business" className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400">
              <Building2 className="w-3.5 h-3.5" />
              {t('landing.switchToBusiness')}
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-16 max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 shape bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
            {t('landing.employeesPageTitle')}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
            {t('landing.employeesPageDesc')}
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 shape font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-all shadow-lg"
          >
            <LogIn className="w-5 h-5" />
            {t('landing.employeesLogin')}
          </Link>
        </div>
      </section>

      {/* Modules */}
      <section className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
        <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              {t('landing.employeesModulesTitle')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              {t('landing.employeesModulesSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {modules.map((mod) => {
              const Icon = mod.icon
              return (
                <div
                  key={mod.nameKey}
                  className="p-8 shape border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                >
                  <div className={`w-12 h-12 shape flex items-center justify-center mb-5 ${
                    mod.color === 'emerald'
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                      : 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t(mod.nameKey)}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">{t(mod.descKey)}</p>
                  <ul className="space-y-2">
                    {mod.itemKeys.map((key) => (
                      <li key={key} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <svg className={`w-4 h-4 shrink-0 ${mod.color === 'emerald' ? 'text-emerald-500' : 'text-violet-500'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {t(key)}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Access note + login */}
      <section className="py-16">
        <div className="px-4 sm:px-6 lg:px-8 max-w-lg mx-auto text-center">
          <div className="text-left p-5 mb-8 shape bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-200 space-y-2">
            <p>{t('landing.employeesNote1')}</p>
            <p>{t('landing.employeesNote2')}</p>
          </div>

          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 shape font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-all shadow-lg"
          >
            <LogIn className="w-5 h-5" />
            {t('landing.employeesLogin')}
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-6">
            {t('landing.employeesNoSignup')}
          </p>
        </div>
      </section>
    </div>
  )
}
