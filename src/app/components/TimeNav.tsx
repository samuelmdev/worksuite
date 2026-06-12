'use client'

import React from 'react'
import Link from 'next/link'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

const navItems: { nameKey: TranslationKey; href: string; overview?: boolean }[] = [
  { nameKey: 'common.overview', href: '/time-tracking', overview: true },
  { nameKey: 'time.nav.hours', href: '/time-tracking/hours' },
  { nameKey: 'common.reports', href: '/time-tracking/reports' },
]

export default function TimeNav() {
  const { t } = useLocale()

  return (
    <nav className="flex items-center space-x-4 text-sm">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={item.overview ? 'font-medium' : undefined}
        >
          {t(item.nameKey)}
        </Link>
      ))}
    </nav>
  )
}
