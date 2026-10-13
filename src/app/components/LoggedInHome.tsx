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
  Wallet,
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
  color: 'cyan' | 'emerald' | 'violet' | 'blue' | 'gold' | 'red'
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
    nameKey: 'nav.finance',
    descKey: 'home.financeDesc',
    ctaKey: 'home.accessFinance',
    href: '/finance',
    color: 'gold',
    icon: Wallet,
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

/**
 * Cards are flat panels with a hairline border, the way DigiShift draws them.
 * The module's colour appears in three places only — the icon tile, the border
 * on hover, and the call to action — so six cards side by side read as one set
 * rather than a swatch chart. `rule` is the short line under the heading that
 * ties the card back to its tab in the header.
 */
const colorStyles = {
  cyan: {
    card: 'border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-700',
    icon: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300',
    rule: 'bg-cyan-500',
    cta: 'group-hover:bg-cyan-600 group-hover:text-white',
  },
  emerald: {
    card: 'border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700',
    icon: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    rule: 'bg-emerald-500',
    cta: 'group-hover:bg-emerald-600 group-hover:text-white',
  },
  violet: {
    card: 'border-slate-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-700',
    icon: 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
    rule: 'bg-violet-500',
    cta: 'group-hover:bg-violet-600 group-hover:text-white',
  },
  blue: {
    card: 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700',
    icon: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    rule: 'bg-blue-500',
    cta: 'group-hover:bg-blue-600 group-hover:text-white',
  },
  gold: {
    // Gold is light at full strength, so it takes dark text rather than white.
    card: 'border-slate-200 dark:border-slate-800 hover:border-yellow-400 dark:hover:border-yellow-700',
    icon: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300',
    rule: 'bg-yellow-500',
    cta: 'group-hover:bg-yellow-500 group-hover:text-slate-950',
  },
  red: {
    card: 'border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-700',
    icon: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
    rule: 'bg-red-500',
    cta: 'group-hover:bg-red-600 group-hover:text-white',
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
        {/* Two drifting spots, ember and silver, the way DigiShift lights a hero. */}
        <div aria-hidden className="spot drift -top-32 -right-24 size-[26rem] bg-ember/40" />
        <div aria-hidden className="spot drift-slow -bottom-28 left-[8%] size-72 bg-silver/50" />

        <div className="relative px-4 sm:px-6 lg:px-8 pt-10 pb-8 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="label text-slate-500 dark:text-slate-400 mb-4">
              {t(getGreetingKey())}, {firstName}
            </p>
            <h1 className="display-tight text-[clamp(2rem,5.5vw,3.75rem)] text-slate-900 dark:text-white mb-4">
              {t('home.welcomeBack', { name: user.name })}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl text-lg">
              {t('home.dashboardSubtitle')}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-7">
              {currentOrganization && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 shape-sm bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                  <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="label text-slate-700 dark:text-slate-300">
                    {currentOrganization.name}
                  </span>
                </div>
              )}
              <span className="inline-flex items-center px-3 py-1.5 shape-sm bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 label">
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
          className="label text-slate-500 dark:text-slate-400 mb-5 border-t border-slate-200 dark:border-slate-800 pt-5"
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
                  className={`group relative flex flex-col h-full p-6 shape border bg-white dark:bg-slate-900 transition-[border-color,translate] duration-300 ease-shift hover:-translate-y-1 ${styles.card}`}
                >
                  <div className={`w-12 h-12 shape-sm flex items-center justify-center mb-5 ${styles.icon}`}>
                    <Icon className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h3 className="display-tight text-2xl text-slate-900 dark:text-white mb-3">
                    {t(mod.nameKey)}
                  </h3>
                  {/* The same colour as this module's tab in the header. */}
                  <span aria-hidden className={`block h-0.5 w-10 mb-4 ${styles.rule}`} />
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-1 mb-6">
                    {t(mod.descKey)}
                  </p>
                  <span className={`inline-flex items-center gap-2 self-start px-4 py-2 shape-sm text-sm font-semibold transition-colors bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 ${styles.cta}`}>
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
          className="shape border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm p-6"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            {t('home.quickLinks')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/settings/profile"
              className="flex items-center gap-4 p-4 shape border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="w-10 h-10 shape-sm bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
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
              className="flex items-center gap-4 p-4 shape border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="w-10 h-10 shape-sm bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
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
