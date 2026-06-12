'use client'

import React from 'react'
import Link from 'next/link'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

const navItems: { nameKey: TranslationKey; href: string; overview?: boolean }[] = [
  { nameKey: 'common.overview', href: '/crm', overview: true },
  { nameKey: 'crm.nav.clients', href: '/crm/clients' },
  { nameKey: 'common.reports', href: '/crm/reports' },
]

export default function CRMNav() {
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
