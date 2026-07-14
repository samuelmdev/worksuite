'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useLocale } from '../lib/locale'
import { getModuleColorClasses, type LandingModule } from '../lib/landing-modules'

type ModuleInfoModalProps = {
  module: LandingModule | null
  onClose: () => void
}

export default function ModuleInfoModal({ module, onClose }: ModuleInfoModalProps) {
  const { t } = useLocale()

  useEffect(() => {
    if (!module) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [module, onClose])

  if (!module) return null

  const colors = getModuleColorClasses(module.color)

  return (
    <AnimatePresence>
      {module && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-modal-title"
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`px-6 py-5 border-b border-slate-200 dark:border-slate-700 ${colors.header}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-white/70 dark:bg-slate-900/50 ${colors.icon}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={module.icon} />
                    </svg>
                  </div>
                  <h2 id="module-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
                    {t(module.nameKey)}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label={t('landing.moduleModal.close')}
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {t(module.overviewKey)}
              </p>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                {t('landing.moduleModal.features')}
              </h3>
              <ul className="space-y-3">
                {module.detailKeys.map((key) => (
                  <li key={key} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <svg className={`w-4 h-4 shrink-0 mt-0.5 ${colors.check}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('landing.moduleModal.close')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
