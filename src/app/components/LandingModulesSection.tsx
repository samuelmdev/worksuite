'use client'

import React, { useState } from 'react'
import { useLocale } from '../lib/locale'
import { LANDING_MODULES, getModuleColorClasses, type LandingModule } from '../lib/landing-modules'
import ModuleInfoModal from './ModuleInfoModal'

type LandingModulesSectionProps = {
  compact?: boolean
}

export default function LandingModulesSection({ compact = false }: LandingModulesSectionProps) {
  const { t } = useLocale()
  const [selectedModule, setSelectedModule] = useState<LandingModule | null>(null)

  return (
    <>
      <section id="features" className={compact ? 'py-20 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800' : 'py-24 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800'}>
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className={compact ? 'text-center mb-12' : 'text-center mb-16'}>
            {!compact && (
              <p className="text-cyan-600 dark:text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-3">
                {t('landing.modulesLabel')}
              </p>
            )}
            <h2 className={`font-bold text-slate-900 dark:text-white mb-4 tracking-tight ${compact ? 'text-3xl md:text-4xl' : 'text-3xl md:text-5xl'}`}>
              {t('landing.modulesTitle')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              {t('landing.modulesSubtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {LANDING_MODULES.map((mod) => {
              const colors = getModuleColorClasses(mod.color)
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setSelectedModule(mod)}
                  className={`group relative p-8 shape border text-left bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/20 hover:-translate-y-1 cursor-pointer ${colors.accent} border-slate-200 dark:border-slate-700`}
                >
                  <div className={`w-12 h-12 shape flex items-center justify-center mb-6 ${colors.icon}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mod.icon} />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-slate-700 dark:group-hover:text-slate-100">
                    {t(mod.nameKey)}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-5">
                    {t(mod.descKey)}
                  </p>
                  <ul className="space-y-2 mb-4">
                    {mod.itemKeys.map((itemKey) => (
                      <li key={itemKey} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <svg className={`w-4 h-4 shrink-0 ${colors.check}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {t(itemKey)}
                      </li>
                    ))}
                  </ul>
                  <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
                    {t('landing.moduleModal.openHint')} →
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <ModuleInfoModal module={selectedModule} onClose={() => setSelectedModule(null)} />
    </>
  )
}
