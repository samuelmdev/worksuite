'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

export default function SuiteNav() {
  const pathname = usePathname()
  const { t } = useLocale()

  const navItems: { nameKey: TranslationKey; href: string; color: string }[] = [
    { nameKey: 'nav.suite.crm', href: '/crm', color: 'cyan' },
    { nameKey: 'nav.suite.timeTracking', href: '/time-tracking', color: 'emerald' },
    { nameKey: 'nav.suite.projects', href: '/projects', color: 'violet' },
    { nameKey: 'nav.suite.settings', href: '/settings', color: 'gray' }
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="hidden md:flex items-end">
      {navItems.map((item) => {
        const active = isActive(item.href)
        return (
          <div key={item.nameKey} className="relative">
            <Link
              href={item.href}
              className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? `bg-${item.color}-100 dark:bg-${item.color}-900 text-${item.color}-700 dark:text-${item.color}-300 shadow-sm rounded-t-lg`
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg'
              }`}
            >
              {t(item.nameKey)}
            </Link>
            {active && (
              <div className={`absolute -bottom-1 left-0 right-0 h-1 bg-${item.color}-100 dark:bg-${item.color}-900`} />
            )}
          </div>
        )
      })}
    </nav>
  )
}