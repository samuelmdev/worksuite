'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from './lib/auth-context-multi-org'
import { useLocale } from './lib/locale'
import type { TranslationKey } from './lib/translations'
import LoggedInHome from './components/LoggedInHome'

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const { t } = useLocale()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  if (user) {
    return <LoggedInHome />
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Beta Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 dark:from-cyan-700 dark:via-cyan-800 dark:to-blue-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
        <div className="relative px-4 sm:px-6 lg:px-8 py-5">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-white/90 text-sm font-medium tracking-wide uppercase">{t('landing.betaOpen')}</span>
            </div>
            <p className="text-white/90 text-sm sm:text-base">
              {t('landing.betaOffer', {
                free: t('landing.betaFree'),
                discount: t('landing.betaDiscount'),
              })}
            </p>
            <Link
              href="/auth/signup?beta=true"
              className="shrink-0 bg-white text-cyan-700 px-5 py-2 rounded-full text-sm font-semibold hover:bg-cyan-50 transition-all shadow-lg shadow-cyan-900/20 hover:shadow-xl hover:-translate-y-0.5"
            >
              {t('landing.joinBeta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-cyan-400/20 via-violet-400/10 to-transparent dark:from-cyan-500/10 dark:via-violet-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-4 sm:px-6 lg:px-8 pt-24 pb-28 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-sm text-sm text-slate-600 dark:text-slate-300 mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            {t('landing.heroBadge')}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6">
            <span className="text-slate-900 dark:text-white">{t('landing.heroTitle1')}</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 dark:from-cyan-400 dark:via-blue-400 dark:to-violet-400 bg-clip-text text-transparent">
              {t('landing.heroTitle2')}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('landing.heroDesc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/signup"
              className="group inline-flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3.5 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5 hover:-translate-y-0.5"
            >
              {t('landing.startTrial')}
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800 transition-all"
            >
              {t('landing.exploreFeatures')}
            </a>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: '0.25h', labelKey: 'landing.statPrecision' as TranslationKey },
              { value: '3-in-1', labelKey: 'landing.statSuite' as TranslationKey },
              { value: '14-day', labelKey: 'landing.statTrial' as TranslationKey },
            ].map((stat) => (
              <div key={stat.labelKey} className="text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">{t('landing.modulesLabel')}</p>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              {t('landing.modulesTitle')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              {t('landing.modulesSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                nameKey: 'nav.crm' as TranslationKey,
                color: 'cyan',
                icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
                descKey: 'landing.crmDesc' as TranslationKey,
                itemKeys: ['landing.crmItem1', 'landing.crmItem2', 'landing.crmItem3'] as TranslationKey[],
              },
              {
                nameKey: 'nav.timeTracking' as TranslationKey,
                color: 'emerald',
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                descKey: 'landing.timeDesc' as TranslationKey,
                itemKeys: ['landing.timeItem1', 'landing.timeItem2', 'landing.timeItem3'] as TranslationKey[],
              },
              {
                nameKey: 'nav.projects' as TranslationKey,
                color: 'violet',
                icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                descKey: 'landing.projectsDesc' as TranslationKey,
                itemKeys: ['landing.projectsItem1', 'landing.projectsItem2', 'landing.projectsItem3'] as TranslationKey[],
              },
            ].map((mod) => (
              <div
                key={mod.nameKey}
                className={`group relative p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/20 hover:-translate-y-1`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${
                  mod.color === 'cyan' ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400' :
                  mod.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' :
                  'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mod.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t(mod.nameKey)}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-5">{t(mod.descKey)}</p>
                <ul className="space-y-2">
                  {mod.itemKeys.map((itemKey) => (
                    <li key={itemKey} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <svg className={`w-4 h-4 shrink-0 ${
                        mod.color === 'cyan' ? 'text-cyan-500' :
                        mod.color === 'emerald' ? 'text-emerald-500' : 'text-violet-500'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t(itemKey)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-slate-100 dark:bg-slate-950">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">{t('landing.pricingLabel')}</p>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              {t('landing.pricingTitle')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              {t('landing.pricingSubtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { nameKey: 'nav.crm' as TranslationKey, price: 49, color: 'cyan', plan: 'crm', featureKeys: ['landing.plan.crm.f1', 'landing.plan.crm.f2', 'landing.plan.users', 'landing.plan.emailSupport'] as TranslationKey[] },
              { nameKey: 'nav.timeTracking' as TranslationKey, price: 39, color: 'emerald', plan: 'time_tracking', featureKeys: ['landing.plan.time.f1', 'landing.plan.time.f2', 'landing.plan.users', 'landing.plan.emailSupport'] as TranslationKey[] },
              { nameKey: 'nav.projects' as TranslationKey, price: 39, color: 'violet', plan: 'projects', featureKeys: ['landing.plan.projects.f1', 'landing.plan.projects.f2', 'landing.plan.users', 'landing.plan.emailSupport'] as TranslationKey[] },
              { nameKey: 'landing.plan.twoModules' as TranslationKey, price: 75, color: 'orange', plan: 'two_modules', featureKeys: ['landing.plan.two.f1', 'landing.plan.two.f2', 'landing.plan.users', 'landing.plan.prioritySupport'] as TranslationKey[] },
            ].map((plan) => (
              <div
                key={plan.plan}
                className="flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t(plan.nameKey)}</h3>
                <div className="mb-5">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">${plan.price}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{t('landing.perMonth')}</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t(featureKey)}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/auth/signup?plan=${plan.plan}`}
                  className={`block text-center py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                    plan.color === 'cyan' ? 'bg-cyan-600 hover:bg-cyan-700' :
                    plan.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    plan.color === 'violet' ? 'bg-violet-600 hover:bg-violet-700' :
                    'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {t('landing.startTrialBtn')}
                </Link>
              </div>
            ))}
          </div>

          {/* Full Suite highlight */}
          <div className="mt-8 max-w-md mx-auto">
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50 border-2 border-cyan-400/50 dark:border-cyan-500/40 shadow-lg dark:shadow-cyan-900/20">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{t('landing.bestValue')}</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-1">{t('landing.fullSuite')}</h3>
              <div className="text-center mb-6">
                <span className="text-4xl font-black text-slate-900 dark:text-white">$99</span>
                <span className="text-slate-500 dark:text-slate-400">{t('landing.perMonth')}</span>
              </div>
              <ul className="space-y-2.5 mb-8">
                {(['landing.fullSuite.f1', 'landing.fullSuite.f2', 'landing.fullSuite.f3', 'landing.plan.users', 'landing.fullSuite.f4', 'landing.fullSuite.f5'] as TranslationKey[]).map((featureKey) => (
                  <li key={featureKey} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <svg className="w-4 h-4 text-cyan-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {t(featureKey)}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup?plan=full_suite"
                className="block text-center py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white transition-all shadow-lg shadow-cyan-500/25"
              >
                {t('landing.startFullSuite')}
              </Link>
            </div>
          </div>

          <div className="mt-10 max-w-2xl mx-auto text-center p-6 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
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
            {t('landing.ctaDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup?beta=true"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5"
            >
              {t('landing.ctaBeta')}
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              {t('landing.ctaRegular')}
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