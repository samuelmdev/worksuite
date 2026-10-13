'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { User, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { user, currentOrganization, logout } = useAuth()
  const { t } = useLocale()
  const router = useRouter()

  useEffect(() => setMounted(true), [])

  const updateMenuPos = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
  }

  const toggleOpen = () => {
    if (!isOpen) updateMenuPos()
    setIsOpen((open) => !open)
  }

  const closeMenu = () => setIsOpen(false)

  // Await the sign-out before navigating. Firing it and pushing immediately
  // raced the teardown, so the next page could mount while the session was
  // still present and sign the user straight back in.
  const handleLogout = async () => {
    closeMenu()
    await logout()
    router.replace('/auth/login')
    router.refresh()
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <a
          href="/auth/login"
          className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {t('auth.login')}
        </a>
        <a
          href="/auth/signup"
          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium shape-sm transition-colors"
        >
          {t('auth.signUp')}
        </a>
      </div>
    )
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'manager':
        return 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200'
      case 'employee':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="flex items-center justify-center h-10 w-10 sm:w-auto sm:h-auto sm:gap-2 sm:px-2 sm:py-2 shape-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shrink-0"
      >
        <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
            {user.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {currentOrganization?.role || t('common.noOrganization')}
          </p>
        </div>
        <ChevronDown className={`hidden sm:block w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                key="user-menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[60]"
                onClick={closeMenu}
              />
              <motion.div
                key="user-menu-panel"
                className="fixed w-64 bg-white dark:bg-slate-800 shape-sm shadow-lg border border-gray-200 dark:border-slate-700 z-[70]"
                style={{ top: menuPos.top, right: menuPos.right }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* User Info */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        {user.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${getRoleColor(currentOrganization?.role || 'employee')}`}>
                        {currentOrganization?.role || t('common.noOrganization')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={() => {
                      closeMenu()
                      router.push('/settings/profile')
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <User className="w-4 h-4 mr-3" />
                    {t('settings.section.profile')}
                  </button>

                  <button
                    onClick={() => {
                      closeMenu()
                      handleLogout()
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    {t('userMenu.signOut')}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
