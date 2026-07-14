'use client'

import React from 'react'
import Link from 'next/link'
import { Building2, Users } from 'lucide-react'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'
import AudienceSelector from './AudienceSelector'
import LandingPricing from './LandingPricing'
import LandingModulesSection from './LandingModulesSection'
import ModuleNameSlider from './ModuleNameSlider'

export default function LandingMarketing() {
  const { t } = useLocale()

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 bg-slate-50 dark:bg-slate-950">
      {/* Hero — slightly shorter than viewport so next section peeks */}
      <section className="relative overflow-hidden min-h-[calc(100svh-4rem-3rem)] flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-cyan-400/20 via-violet-400/10 to-transparent dark:from-cyan-500/10 dark:via-violet-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 pt-16 pb-8 sm:pt-20 sm:pb-10 max-w-5xl mx-auto w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-sm text-sm text-slate-600 dark:text-slate-300 mb-6 sm:mb-8 shadow-sm mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            {t('landing.heroBadge')}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 sm:mb-6">
            <span className="text-slate-900 dark:text-white">{t('landing.heroTitle1')}</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 dark:from-cyan-400 dark:via-blue-400 dark:to-violet-400 bg-clip-text text-transparent">
              {t('landing.heroTitle2')}
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            {t('landing.heroDesc')}
          </p>

          <AudienceSelector variant="hero" />

          <div className="mt-10 sm:mt-12 grid grid-cols-3 gap-4 sm:gap-6 max-w-lg mx-auto">
            {[
              { value: '0.25h', labelKey: 'landing.statPrecision' as TranslationKey },
              { value: '5-in-1', labelKey: 'landing.statSuite' as TranslationKey },
              { value: '5', labelKey: 'landing.statUsers' as TranslationKey },
            ].map((stat) => (
              <div key={stat.labelKey} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>

        <ModuleNameSlider />
      </section>

      <LandingModulesSection />

      {/* Audience selection */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950 border-y border-slate-200/80 dark:border-slate-800">
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">
              {t('landing.audienceLabel')}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              {t('landing.audienceTitle')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              {t('landing.audienceSubtitle')}
            </p>
          </div>
          <AudienceSelector variant="section" />
        </div>
      </section>

      <LandingPricing />

      {/* Analytics / Precision */}
      <section className="py-24 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">{t('landing.whyLabel')}</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight">
                {t('landing.whyTitle')}
              </h2>
              <div className="space-y-6">
                {[
                  { num: '01', titleKey: 'landing.why1Title' as TranslationKey, descKey: 'landing.why1Desc' as TranslationKey },
                  { num: '02', titleKey: 'landing.why2Title' as TranslationKey, descKey: 'landing.why2Desc' as TranslationKey },
                  { num: '03', titleKey: 'landing.why3Title' as TranslationKey, descKey: 'landing.why3Desc' as TranslationKey },
                ].map((item) => (
                  <div key={item.num} className="flex gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:border-cyan-400/50 dark:group-hover:border-cyan-500/50 transition-colors">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{item.num}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{t(item.titleKey)}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t(item.descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 dark:from-cyan-500/5 dark:to-violet-500/5 rounded-3xl blur-xl" />
              <div className="relative p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{t('landing.dashboardOverview')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { labelKey: 'landing.totalClients' as TranslationKey, value: '1,247', accent: 'text-cyan-600 dark:text-cyan-400' },
                    { labelKey: 'landing.hoursTracked' as TranslationKey, value: '12,456', accent: 'text-emerald-600 dark:text-emerald-400' },
                    { labelKey: 'landing.activeProjects' as TranslationKey, value: '89', accent: 'text-violet-600 dark:text-violet-400' },
                    { labelKey: 'landing.revenue' as TranslationKey, value: '$234K', accent: 'text-blue-600 dark:text-blue-400' },
                  ].map((stat) => (
                    <div key={stat.labelKey} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t(stat.labelKey)}</div>
                      <div className={`text-2xl font-bold ${stat.accent}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/15 dark:bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-5 tracking-tight">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
            {t('landing.ctaDescBusiness')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5"
            >
              <Building2 className="w-5 h-5" />
              {t('landing.subscribeCta')}
            </Link>
            <Link
              href="/?view=employees"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              <Users className="w-5 h-5" />
              {t('landing.forEmployees')}
            </Link>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-8">
            {t('landing.ctaFootnote')}
          </p>
        </div>
      </section>
    </div>
  )
}
