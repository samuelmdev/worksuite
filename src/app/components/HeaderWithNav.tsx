'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import MobileNav from './MobileNav'
import ThemeToggle from './ThemeToggle'
import LocaleSwitcher from './LocaleSwitcherClient'
import UserMenu from './UserMenu'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

export default function HeaderWithNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useLocale()

  const allNavItems: { nameKey: TranslationKey; href: string; color: string }[] = [
    { nameKey: 'nav.crm', href: '/crm', color: 'cyan' },
    { nameKey: 'nav.timeTracking', href: '/time-tracking', color: 'emerald' },
    { nameKey: 'nav.projects', href: '/projects', color: 'violet' },
    { nameKey: 'nav.settings', href: '/settings', color: 'slate' },
  ]

  const navItems = user ? allNavItems : []

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const colorMap: Record<string, {
    bg: string
    bgDark: string
    text: string
    textDark: string
    shadow: string
    shadowDark: string
  }> = {
    cyan: {
      bg: 'bg-cyan-200',
      bgDark: 'dark:bg-cyan-700',
      text: 'text-cyan-700',
      textDark: 'dark:text-cyan-300',
      shadow: 'shadow-cyan-300/50',
      shadowDark: 'dark:shadow-cyan-800/50',
    },
    emerald: {
      bg: 'bg-emerald-200',
      bgDark: 'dark:bg-emerald-700',
      text: 'text-emerald-700',
      textDark: 'dark:text-emerald-300',
      shadow: 'shadow-emerald-300/50',
      shadowDark: 'dark:shadow-emerald-800/50',
    },
    violet: {
      bg: 'bg-violet-200',
      bgDark: 'dark:bg-violet-700',
      text: 'text-violet-700',
      textDark: 'dark:text-violet-300',
      shadow: 'shadow-violet-300/50',
      shadowDark: 'dark:shadow-violet-800/50',
    },
    slate: {
      bg: 'bg-slate-200',
      bgDark: 'dark:bg-slate-700',
      text: 'text-slate-700',
      textDark: 'dark:text-slate-300',
      shadow: 'shadow-slate-300/50',
      shadowDark: 'dark:shadow-slate-800/50',
    },
  }

  const getColorClasses = (color: string) => colorMap[color] ?? colorMap.slate

  const getActiveColor = () => {
    const activeItem = navItems.find(item => isActive(item.href))
    return activeItem ? activeItem.color : 'slate'
  }

  const activeColor = getActiveColor()
  const activeClasses = getColorClasses(activeColor)
  const isHomePage = pathname === '/'
  const hasActiveNav = navItems.some(item => isActive(item.href))

  const headerClasses = `sticky top-0 z-50 ${
    isHomePage
      ? 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-md shadow-md shadow-slate-300/50 dark:shadow-gray-950/50'
      : `bg-white dark:bg-slate-800 shadow-md ${
          hasActiveNav
            ? `${activeClasses.shadow} ${activeClasses.shadowDark}`
            : 'shadow-slate-300/50 dark:shadow-gray-950/50'
        }`
  }`

  return (
    <header className={headerClasses}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center xl:items-end h-16 xl:pb-1">
          <div className="flex items-center shrink-0 xl:mb-1">
            <Link href="/" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              WorkSuite
            </Link>
          </div>
          <div className="flex-1 flex justify-center min-w-0 self-end">
            <nav className="hidden xl:flex items-end gap-2 relative">
              {navItems.map((item, index) => {
                const active = isActive(item.href)
                const colors = getColorClasses(item.color)
                return (
                  <motion.div
                    key={item.href}
                    className="relative flex items-center justify-center"
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.1,
                      duration: 0.6,
                      ease: 'easeOut'
                    }}
                  >
                    <Link
                      href={item.href}
                      className={`relative px-4 py-2 text-md transition-all duration-400 w-40 ${
                        active
                          ? `${colors.bg} ${colors.bgDark} ${colors.text} ${colors.textDark} shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] rounded-t-lg font-medium text-center`
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] dark:hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] shadow-md shadow-slate-500/30 dark:shadow-black/40 rounded-lg hover:cursor-pointer font-medium text-center'
                      }`}
                      style={{
                        transform: active ? 'translateY(4px)' : 'translateY(1px)',
                        transition: 'transform 0.4s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.transform = 'translateY(3px)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.transform = 'translateY(1px)'
                        }
                      }}
                    >
                      {t(item.nameKey)}
                    </Link>
                    {active && (
                      <div className={`absolute -bottom-2 left-0 right-0 h-1 ${colors.bg} ${colors.bgDark} transition-all duration-300`} />
                    )}
                  </motion.div>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center xl:items-end shrink-0 xl:mb-1">
            <MobileNav />
            <div className="hidden xl:flex items-center space-x-4">
              <ThemeToggle />
              <LocaleSwitcher />
              <UserMenu />
            </div>
          </div>
        </div>
      </div>
      <div className={`w-full h-1 transition-colors duration-600 ${
        hasActiveNav
          ? `${activeClasses.bg} ${activeClasses.bgDark}`
          : 'bg-slate-200 dark:bg-slate-700'
      }`} />
    </header>
  )
}
