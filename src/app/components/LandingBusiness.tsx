'use client'

import React from 'react'
import Link from 'next/link'
import { Building2, Users, ArrowRight } from 'lucide-react'
import { useLocale } from '../lib/locale'
import LandingPricing from './LandingPricing'
import LandingModulesSection from './LandingModulesSection'

export default function LandingBusiness() {
  const { t } = useLocale()

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="px-4 sm:px-6 lg:px-8 py-3 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-700 dark:text-cyan-400">
            <Building2 className="w-4 h-4" />
            {t('landing.forBusiness')}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              {t('landing.backToHome')}
            </Link>
            <Link href="/?view=employees" className="text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400">
              {t('landing.switchToEmployees')}
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-24 max-w-5xl mx-auto text-center">
          <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400 mb-4 uppercase tracking-wide">
            {t('landing.businessHeroLabel')}
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6">
            <span className="text-slate-900 dark:text-white">{t('landing.heroTitle1')}</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 dark:from-cyan-400 dark:via-blue-400 dark:to-violet-400 bg-clip-text text-transparent">
              {t('landing.heroTitle2')}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('landing.businessHeroDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="group inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3.5 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl hover:-translate-y-0.5"
            >
              {t('landing.subscribeCta')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-all"
            >
              {t('landing.exploreFeatures')}
            </a>
          </div>
        </div>
      </section>

      <LandingModulesSection compact />

      <LandingPricing compact />

      {/* Final CTA */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t('landing.ctaTitle')}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">{t('landing.businessHeroDesc')}</p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-lg"
          >
            {t('landing.subscribeCta')}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-sm text-slate-500 mt-6 flex items-center justify-center gap-1.5">
            <Users className="w-4 h-4" />
            {t('landing.switchToEmployees')}
            <Link href="/?view=employees" className="text-cyan-600 dark:text-cyan-400 hover:underline ml-1">
              {t('landing.forEmployeesCta')}
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
