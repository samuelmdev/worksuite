'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Users, Clock, FolderOpen, Settings, Home, CreditCard, UserCog, Wallet } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import LocaleSwitcher from './LocaleSwitcherClient'
import UserMenu from './UserMenu'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'
import { useAccessibleNavItems } from '../lib/use-module-access'
import type { TranslationKey } from '../lib/translations'

const ALL_NAV_ITEMS: { nameKey: TranslationKey; href: string; icon: typeof Home; color: string }[] = [
  { nameKey: 'nav.home', href: '/', icon: Home, color: 'slate' },
  { nameKey: 'nav.crm', href: '/crm', icon: Users, color: 'cyan' },
  { nameKey: 'nav.timeTracking', href: '/time-tracking', icon: Clock, color: 'emerald' },
  { nameKey: 'nav.projects', href: '/projects', icon: FolderOpen, color: 'violet' },
  { nameKey: 'nav.billing', href: '/billing', icon: CreditCard, color: 'blue' },
  { nameKey: 'nav.finance', href: '/finance', icon: Wallet, color: 'gold' },
  { nameKey: 'nav.team', href: '/team', icon: UserCog, color: 'red' },
  { nameKey: 'nav.settings', href: '/settings', icon: Settings, color: 'gray' },
]

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useLocale()
  const navItems = useAccessibleNavItems(ALL_NAV_ITEMS)

  useEffect(() => setMounted(true), [])

  const updateMenuPos = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 8, left: rect.left })
    }
  }

  const toggleOpen = () => {
    if (!isOpen) updateMenuPos()
    setIsOpen((open) => !open)
  }

  const closeMenu = () => setIsOpen(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const getCurrentModule = () => {
    const activeItem = navItems.find(item => isActive(item.href))
    return activeItem || navItems[0] || ALL_NAV_ITEMS[0]
  }

  const currentModule = getCurrentModule()

  return (
    <div className="xl:hidden flex items-center gap-2 shrink-0">
      {user && navItems.length > 0 && (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleOpen}
          className="flex items-center gap-2 h-10 px-3 shape-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm shrink-0"
        >
          <currentModule.icon className={`w-4 h-4 shrink-0 ${
            currentModule.color === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' :
            currentModule.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
            currentModule.color === 'violet' ? 'text-violet-600 dark:text-violet-400' :
            currentModule.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
            currentModule.color === 'gold' ? 'text-yellow-600 dark:text-yellow-400' :
            currentModule.color === 'red' ? 'text-red-600 dark:text-red-400' :
            'text-slate-600 dark:text-slate-400'
          }`} />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 max-w-[7rem] truncate">
            {t(currentModule.nameKey)}
          </span>
          <ChevronDown className={`w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Mobile Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        <LocaleSwitcher />
        <UserMenu />
      </div>

      {mounted && user && navItems.length > 0 && createPortal(
        <>
          <AnimatePresence>
            {isOpen && (
              <>
                <motion.div
                  key="mobile-nav-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-[60]"
                  onClick={closeMenu}
                />
                <motion.div
                  key="mobile-nav-menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed w-64 bg-white dark:bg-slate-800 shape-sm shadow-lg border border-gray-200 dark:border-slate-700 z-[70]"
                  style={{ top: menuPos.top, left: menuPos.left }}
                >
                  <div className="py-2">
                    {navItems.map((item) => {
                      const active = isActive(item.href)
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMenu}
                          className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                            active
                              ? item.color === 'slate'
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                : item.color === 'cyan'
                                ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                                : item.color === 'emerald'
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                                : item.color === 'violet'
                                ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                                : item.color === 'blue'
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : item.color === 'gold'
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-100'
                                : item.color === 'red'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${
                            active
                              ? item.color === 'cyan' ? 'text-cyan-600 dark:text-cyan-400'
                              : item.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
                              : item.color === 'violet' ? 'text-violet-600 dark:text-violet-400'
                              : item.color === 'blue' ? 'text-blue-600 dark:text-blue-400'
                              : item.color === 'gold' ? 'text-yellow-600 dark:text-yellow-400'
                              : item.color === 'red' ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-500 dark:text-slate-400'
                          }`} />
                          <span>{t(item.nameKey)}</span>
                          {active && (
                            <div className={`ml-auto w-2 h-2 rounded-full shrink-0 ${
                              item.color === 'cyan' ? 'bg-cyan-500'
                              : item.color === 'emerald' ? 'bg-emerald-500'
                              :                               item.color === 'violet' ? 'bg-violet-500'
                              : item.color === 'blue' ? 'bg-blue-500'
                              : item.color === 'gold' ? 'bg-yellow-500'
                              : item.color === 'red' ? 'bg-red-500'
                              : 'bg-slate-500'
                            }`} />
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  )
}
