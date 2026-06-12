'use client'

import React from 'react'
import Link from 'next/link'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

const navItems: { nameKey: TranslationKey; href: string; overview?: boolean }[] = [
  { nameKey: 'common.overview', href: '/projects', overview: true },
  { nameKey: 'projects.nav.create', href: '/projects/create' },
  { nameKey: 'common.reports', href: '/projects/reports' },
  { nameKey: 'projects.nav.templates', href: '/projects/templates' },
]

export default function ProjectNav() {
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
