'use client'

import React from 'react'
import Link from 'next/link'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

const MONTHLY_PRICE = 149
const ANNUAL_PRICE = Math.round(MONTHLY_PRICE * 12 * 0.9)
const ANNUAL_MONTHLY = Math.round(ANNUAL_PRICE / 12)

const FEATURE_KEYS: TranslationKey[] = [
  'landing.fullSuite.f1',
  'landing.fullSuite.f2',
  'landing.fullSuite.f3',
  'landing.plan.users',
  'landing.fullSuite.f4',
  'landing.fullSuite.f5',
  'landing.fullSuite.f6',
]

type LandingPricingProps = {
  compact?: boolean
}

export default function LandingPricing({ compact = false }: LandingPricingProps) {
  const { t } = useLocale()

  return (
    <section className={compact ? 'py-20 bg-slate-100 dark:bg-slate-950' : 'py-24 bg-slate-100 dark:bg-slate-950'}>
      <div className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          {!compact && (
            <p className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">
              {t('landing.pricingLabel')}
            </p>
          )}
          <h2 className={`font-bold text-slate-900 dark:text-white mb-4 tracking-tight ${compact ? 'text-3xl' : 'text-3xl md:text-5xl'}`}>
            {t('landing.pricingTitle')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            {t('landing.pricingSubtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          <div className="p-6 shape bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              {t('landing.monthlyPlan')}
            </p>
            <div className="mb-4">
              <span className="text-4xl font-black text-slate-900 dark:text-white">€{MONTHLY_PRICE}</span>
              <span className="text-slate-500 dark:text-slate-400">{t('landing.perMonth')}</span>
            </div>
            <Link
              href="/auth/signup?plan=monthly"
              className="block text-center py-2.5 shape text-sm font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t('landing.subscribeCta')}
            </Link>
          </div>

          <div className="relative p-6 shape bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50 border-2 border-cyan-400/50 dark:border-cyan-500/40">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-cyan-600 text-white px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
                {t('landing.annualSave')}
              </span>
            </div>
            <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide mb-3">
              {t('landing.annualPlan')}
            </p>
            <div className="mb-1">
              <span className="text-4xl font-black text-slate-900 dark:text-white">€{ANNUAL_PRICE}</span>
              <span className="text-slate-500 dark:text-slate-400">{t('landing.perYear')}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t('landing.annualPriceNote', { price: ANNUAL_MONTHLY })}
            </p>
            <Link
              href="/auth/signup?plan=annual"
              className="block text-center py-2.5 shape text-sm font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 transition-all"
            >
              {t('landing.subscribeCta')}
            </Link>
          </div>
        </div>

        <div className="p-8 shape bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50 border-2 border-cyan-400/50 dark:border-cyan-500/40 shadow-lg dark:shadow-cyan-900/20">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-6">{t('landing.fullSuite')}</h3>
          <ul className="space-y-2.5 mb-6">
            {FEATURE_KEYS.map((featureKey) => (
              <li key={featureKey} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <svg className="w-4 h-4 text-cyan-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t(featureKey)}
              </li>
            ))}
          </ul>
          <Link
            href="/auth/signup"
            className="block text-center py-3 shape font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/25 mb-4"
          >
            {t('landing.subscribeCta')}
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{t('landing.businessSignupNote')}</p>
        </div>

        <div className="mt-10 text-center p-6 shape bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('landing.moreUsers')}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('landing.moreUsersDesc', { price: t('landing.moreUsersPrice') })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            {t('landing.moreUsersExample')}
          </p>
        </div>
      </div>
    </section>
  )
}
