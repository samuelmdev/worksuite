'use client'

import React from 'react'
import Link from 'next/link'
import { Building2, Users, ArrowRight } from 'lucide-react'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'
import AudienceSelector from './AudienceSelector'
import LandingPricing from './LandingPricing'
import LandingModulesSection from './LandingModulesSection'
import LandingChain from './LandingChain'
import HeroBackdrop from './HeroBackdrop'

/** The chain the product is actually built around, stated plainly. */
const FLOW: { stepKey: TranslationKey; descKey: TranslationKey }[] = [
  { stepKey: 'landing.flow1', descKey: 'landing.flow1Desc' },
  { stepKey: 'landing.flow2', descKey: 'landing.flow2Desc' },
  { stepKey: 'landing.flow3', descKey: 'landing.flow3Desc' },
  { stepKey: 'landing.flow4', descKey: 'landing.flow4Desc' },
  { stepKey: 'landing.flow5', descKey: 'landing.flow5Desc' },
]

export default function LandingMarketing() {
  const { t } = useLocale()

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 bg-white dark:bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <HeroBackdrop />

        <div className="relative px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pt-16 pb-14 sm:pt-24 sm:pb-16">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </span>
            {t('landing.heroBadge')}
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-[4.25rem] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white max-w-3xl leading-[1.03] text-balance">
            {t('landing.heroTitle1')}{' '}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10">{t('landing.heroTitle2')}</span>
              {/* Hand-drawn-weight underline instead of a gradient fill. */}
              <span
                aria-hidden
                className="absolute left-0 right-0 bottom-1 sm:bottom-2 h-2 sm:h-3 bg-cyan-400/25 dark:bg-cyan-400/20 -rotate-[0.6deg]"
              />
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            {t('landing.heroDesc')}
          </p>

          <div className="mt-9">
            <AudienceSelector variant="hero" />
          </div>

          {/* The chain the copy above promises, shown rather than described. */}
          <div className="mt-14 sm:mt-16 pt-10 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 mb-8 text-center">
              {t('landing.chainLabel')}
            </p>
            <LandingChain />
          </div>
        </div>
      </section>

      <LandingModulesSection />

      {/* How the modules connect — the actual product argument */}
      <section className="py-20 sm:py-24 border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
              {t('landing.whyLabel')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {t('landing.whyTitle')}
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
              {t('landing.whySubtitle')}
            </p>
          </div>

          <ol className="mt-12 border-t border-slate-200 dark:border-slate-800">
            {FLOW.map((item, index) => (
              <li
                key={item.stepKey}
                className="grid grid-cols-[2rem_1fr] sm:grid-cols-[3rem_14rem_1fr] gap-x-4 gap-y-1 py-5 border-b border-slate-200 dark:border-slate-800"
              >
                <span className="text-sm tabular-nums text-slate-400 dark:text-slate-600 pt-0.5">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {t(item.stepKey)}
                </h3>
                <p className="col-start-2 sm:col-start-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t(item.descKey)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Audience selection */}
      <section className="py-20 sm:py-24 border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
              {t('landing.audienceLabel')}
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {t('landing.audienceTitle')}
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              {t('landing.audienceSubtitle')}
            </p>
          </div>
          <AudienceSelector variant="section" />
        </div>
      </section>

      <LandingPricing />

      {/* Final CTA */}
      <section className="py-20 sm:py-24">
        <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {t('landing.ctaTitle')}
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              {t('landing.ctaDescBusiness')}
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 shape-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Building2 className="w-4 h-4" />
              {t('landing.subscribeCta')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/?view=employees"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 shape-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <Users className="w-4 h-4" />
              {t('landing.forEmployees')}
            </Link>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-500 mt-6">
            {t('landing.ctaFootnote')}
          </p>
        </div>
      </section>
    </div>
  )
}
