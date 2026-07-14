'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

interface SettingsSubpageProps {
  titleKey: TranslationKey
  descKey: TranslationKey
  children: React.ReactNode
  maxWidth?: 'md' | 'lg' | '2xl' | '3xl'
}

const maxWidthClass = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
}

export default function SettingsSubpage({
  titleKey,
  descKey,
  children,
  maxWidth = '2xl',
}: SettingsSubpageProps) {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
      <div className="border-l border-r border-slate-500/50 min-h-screen">
        <div className={`p-4 sm:p-6 space-y-6 ${maxWidthClass[maxWidth]} mx-auto`}>
          <Link
            href="/settings"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('settings.title')}
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 pt-2">
              {t(titleKey)}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t(descKey)}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
