'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Menu, X, FolderOpen, BarChart3, Settings, Home, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'
import ModuleAccessShell from '../components/ModuleAccessShell'

const navigation: { nameKey: TranslationKey; href: string; icon: typeof Home }[] = [
  { nameKey: 'common.overview', href: '/projects', icon: Home },
  { nameKey: 'projects.nav.allProjects', href: '/projects/list', icon: FolderOpen },
  { nameKey: 'projects.nav.team', href: '/projects/team', icon: Users },
  { nameKey: 'projects.nav.analytics', href: '/projects/analytics', icon: BarChart3 },
  { nameKey: 'common.settings', href: '/projects/settings', icon: Settings },
]

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { t } = useLocale()

  // Reset sidebar state when pathname changes to prevent stuck hover states
  useEffect(() => {
    setSidebarExpanded(false)
  }, [pathname])

  return (
    <ModuleAccessShell
      children={children}
      withSidebar={
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <motion.div
        className="hidden md:flex flex-col bg-white dark:bg-slate-800 shadow-lg border-r border-gray-200 dark:border-slate-700"
        initial={{ width: 64 }}
        animate={{ width: sidebarExpanded ? 256 : 64 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        onHoverStart={() => setSidebarExpanded(true)}
        onHoverEnd={() => setSidebarExpanded(false)}
      >
        <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-slate-700">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: sidebarExpanded ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            {t('nav.projects')}
          </motion.div>
        </div>
        
        <nav className="flex-1 px-2 py-4 space-y-2">
          {navigation.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <motion.div
                key={item.nameKey}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={item.href}
                  onClick={() => {
                    // Force sidebar to collapse after navigation
                    setTimeout(() => setSidebarExpanded(false), 100)
                  }}
                  className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 relative z-10" />
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: sidebarExpanded ? 1 : 0, x: sidebarExpanded ? 0 : -10 }}
                    transition={{ duration: 0.2 }}
                    className="ml-3 whitespace-nowrap relative z-10"
                  >
                    {t(item.nameKey)}
                  </motion.span>
                </Link>
              </motion.div>
            )
          })}
        </nav>
      </motion.div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
            <motion.div
              className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-800 shadow-lg border-r border-slate-500/50"
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-slate-700">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('nav.projects')}</span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              
              <nav className="px-2 py-4 space-y-2">
                {navigation.map((item, index) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  
                  return (
                    <motion.div
                      key={item.nameKey}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileSidebarOpen(false)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                          isActive
                            ? 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0 relative z-10" />
                        <span className="ml-3 relative z-10">{t(item.nameKey)}</span>
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('nav.projects')}</span>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 border-l border-r border-slate-500/50">
          {children}
        </main>
      </div>
    </div>
      }
    />
  )
}