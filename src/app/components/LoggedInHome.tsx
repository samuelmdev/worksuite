'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users,
  Clock,
  FolderOpen,
  Settings,
  ArrowRight,
  Building2,
  User,
  CreditCard,
  UserCog,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'
import { filterNavByRole } from '../../lib/module-access'
import type { TranslationKey } from '../lib/translations'

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
}

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const },
  },
}

const modules: {
  nameKey: TranslationKey
  descKey: TranslationKey
  ctaKey: TranslationKey
  href: string
  color: 'cyan' | 'emerald' | 'violet' | 'blue' | 'red'
  icon: typeof Users
}[] = [
  {
    nameKey: 'nav.crm',
    descKey: 'home.crmDesc',
    ctaKey: 'home.accessCrm',
    href: '/crm',
    color: 'cyan',
    icon: Users,
  },
  {
    nameKey: 'nav.timeTracking',
    descKey: 'home.timeDesc',
    ctaKey: 'home.trackTime',
    href: '/time-tracking',
    color: 'emerald',
    icon: Clock,
  },
  {
    nameKey: 'nav.projects',
    descKey: 'home.projectsDesc',
    ctaKey: 'home.manageProjects',
    href: '/projects',
    color: 'violet',
    icon: FolderOpen,
  },
  {
    nameKey: 'nav.billing',
    descKey: 'home.billingDesc',
    ctaKey: 'home.accessBilling',
    href: '/billing',
    color: 'blue',
    icon: CreditCard,
  },
  {
    nameKey: 'nav.team',
    descKey: 'home.teamDesc',
    ctaKey: 'home.manageTeam',
    href: '/team',
    color: 'red',
    icon: UserCog,
  },
]

const colorStyles = {
  cyan: {
    card: 'border-cyan-200/80 dark:border-cyan-800/60 bg-gradient-to-br from-cyan-50/80 to-white dark:from-cyan-950/40 dark:to-slate-900 hover:border-cyan-300 dark:hover:border-cyan-700',
    icon: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-400',
    cta: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    glow: 'group-hover:shadow-cyan-500/10',
  },
  emerald: {
    card: 'border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/40 dark:to-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700',
    icon: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400',
    cta: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    glow: 'group-hover:shadow-emerald-500/10',
  },
  violet: {
    card: 'border-violet-200/80 dark:border-violet-800/60 bg-gradient-to-br from-violet-50/80 to-white dark:from-violet-950/40 dark:to-slate-900 hover:border-violet-300 dark:hover:border-violet-700',
    icon: 'bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-400',
    cta: 'bg-violet-600 hover:bg-violet-700 text-white',
    glow: 'group-hover:shadow-violet-500/10',
  },
  blue: {
    card: 'border-blue-200/80 dark:border-blue-800/60 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/40 dark:to-slate-900 hover:border-blue-300 dark:hover:border-blue-700',
    icon: 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400',
    cta: 'bg-blue-600 hover:bg-blue-700 text-white',
    glow: 'group-hover:shadow-blue-500/10',
  },
  red: {
    card: 'border-red-200/80 dark:border-red-800/60 bg-gradient-to-br from-red-50/80 to-white dark:from-red-950/40 dark:to-slate-900 hover:border-red-300 dark:hover:border-red-700',
    icon: 'bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400',
    cta: 'bg-red-600 hover:bg-red-700 text-white',
    glow: 'group-hover:shadow-red-500/10',
  },
}

function getGreetingKey(): TranslationKey {
  const hour = new Date().getHours()
  if (hour < 12) return 'home.greeting.morning'
  if (hour < 18) return 'home.greeting.afternoon'
  return 'home.greeting.evening'
}

function getRoleLabel(role: string | undefined, t: (key: TranslationKey) => string): string {
  switch (role) {
    case 'admin':
      return t('settings.role.admin')
    case 'manager':
      return t('settings.role.manager')
    case 'employee':
      return t('common.employee')
    default:
      return t('home.roleUser')
  }
}

export default function LoggedInHome() {
  const { user, currentOrganization } = useAuth()
  const { t } = useLocale()

  if (!user) return null

  const accessibleModules = filterNavByRole(modules, currentOrganization?.role)
  const firstName = user.name.split(' ')[0]

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem] dark:bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]" />
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-gradient-to-bl from-cyan-400/15 via-violet-400/10 to-transparent dark:from-cyan-500/10 dark:via-violet-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-emerald-400/10 dark:bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="relative px-4 sm:px-6 lg:px-8 pt-10 pb-8 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400 mb-2">
              {t(getGreetingKey())}, {firstName}
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
              {t('home.welcomeBack', { name: user.name })}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl text-lg">
              {t('home.dashboardSubtitle')}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              {currentOrganization && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 backdrop-blur-sm text-sm">
                  <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {currentOrganization.name}
                  </span>
                </div>
              )}
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300 text-sm font-medium capitalize">
                {getRoleLabel(currentOrganization?.role, t)}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Module cards */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-5"
        >
          {t('home.yourModules')}
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {accessibleModules.map((mod) => {
            const Icon = mod.icon
            const styles = colorStyles[mod.color]
            return (
              <motion.div key={mod.href} variants={fadeUpItem}>
                <Link
                  href={mod.href}
                  className={`group relative flex flex-col h-full p-6 rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${styles.card} ${styles.glow}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${styles.icon}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {t(mod.nameKey)}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-1 mb-6">
                    {t(mod.descKey)}
                  </p>
                  <span className={`inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${styles.cta}`}>
                    {t(mod.ctaKey)}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* Quick links */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm p-6"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            {t('home.quickLinks')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/settings/profile"
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{t('home.viewProfile')}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>

            <Link
              href="/settings"
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{t('home.settings')}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('home.settingsDesc')}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
