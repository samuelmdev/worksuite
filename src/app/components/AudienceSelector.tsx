'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useLocale } from '../lib/locale'

type AudienceSelectorProps = {
  variant?: 'hero' | 'section'
}

export default function AudienceSelector({ variant = 'section' }: AudienceSelectorProps) {
  const { t } = useLocale()

  if (variant === 'hero') {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-4 w-full">
          <Link
            href="/?view=business"
            className="group flex flex-col items-start p-6 rounded-2xl border-2 border-cyan-200 dark:border-cyan-800 bg-white dark:bg-slate-900 hover:border-cyan-500 dark:hover:border-cyan-500 hover:shadow-xl transition-all text-left"
          >
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
              {t('landing.forBusiness')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              {t('landing.forBusinessDescShort')}
            </p>
            <span className="inline-flex items-center text-sm font-semibold text-cyan-600 dark:text-cyan-400 mt-auto">
              {t('landing.forBusinessCta')}
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>

          <Link
            href="/?view=employees"
            className="group flex flex-col items-start p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-xl transition-all text-left"
          >
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {t('landing.forEmployees')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              {t('landing.forEmployeesDescShort')}
            </p>
            <span className="inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300 mt-auto">
              {t('landing.forEmployeesLearnMore')}
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>

        <a
          href="#features"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          {t('landing.exploreFeatures')}
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <Link
        href="/?view=business"
        className="group p-8 rounded-2xl border-2 border-cyan-200 dark:border-cyan-800 bg-white dark:bg-slate-900 hover:border-cyan-500 dark:hover:border-cyan-500 hover:shadow-xl transition-all"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
          {t('landing.forBusiness')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
          {t('landing.forBusinessDesc')}
        </p>
        <span className="inline-flex items-center text-sm font-semibold text-cyan-600 dark:text-cyan-400">
          {t('landing.forBusinessCta')}
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>

      <Link
        href="/?view=employees"
        className="group p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-xl transition-all"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
          {t('landing.forEmployees')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
          {t('landing.forEmployeesDesc')}
        </p>
        <span className="inline-flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          {t('landing.forEmployeesLearnMore')}
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>
    </div>
  )
}
