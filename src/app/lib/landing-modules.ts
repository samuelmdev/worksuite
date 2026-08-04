import type { TranslationKey } from './translations'

export type LandingModuleId = 'crm' | 'time' | 'projects' | 'billing' | 'finance' | 'team'

export type LandingModuleColor = 'cyan' | 'emerald' | 'violet' | 'blue' | 'amber' | 'red'

export type LandingModule = {
  id: LandingModuleId
  nameKey: TranslationKey
  color: LandingModuleColor
  icon: string
  descKey: TranslationKey
  itemKeys: TranslationKey[]
  overviewKey: TranslationKey
  detailKeys: TranslationKey[]
}

export const LANDING_MODULES: LandingModule[] = [
  {
    id: 'crm',
    nameKey: 'nav.crm',
    color: 'cyan',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    descKey: 'landing.crmDesc',
    itemKeys: ['landing.crmItem1', 'landing.crmItem2', 'landing.crmItem3'],
    overviewKey: 'landing.module.crm.overview',
    detailKeys: [
      'landing.module.crm.detail1',
      'landing.module.crm.detail2',
      'landing.module.crm.detail3',
      'landing.module.crm.detail4',
      'landing.module.crm.detail5',
      'landing.module.crm.detail6',
    ],
  },
  {
    id: 'time',
    nameKey: 'nav.timeTracking',
    color: 'emerald',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    descKey: 'landing.timeDesc',
    itemKeys: ['landing.timeItem1', 'landing.timeItem2', 'landing.timeItem3'],
    overviewKey: 'landing.module.time.overview',
    detailKeys: [
      'landing.module.time.detail1',
      'landing.module.time.detail2',
      'landing.module.time.detail3',
      'landing.module.time.detail4',
      'landing.module.time.detail5',
      'landing.module.time.detail6',
    ],
  },
  {
    id: 'projects',
    nameKey: 'nav.projects',
    color: 'violet',
    icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    descKey: 'landing.projectsDesc',
    itemKeys: ['landing.projectsItem1', 'landing.projectsItem2', 'landing.projectsItem3'],
    overviewKey: 'landing.module.projects.overview',
    detailKeys: [
      'landing.module.projects.detail1',
      'landing.module.projects.detail2',
      'landing.module.projects.detail3',
      'landing.module.projects.detail4',
      'landing.module.projects.detail5',
      'landing.module.projects.detail6',
    ],
  },
  {
    id: 'billing',
    nameKey: 'nav.billing',
    color: 'blue',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    descKey: 'landing.billingDesc',
    itemKeys: ['landing.billingItem1', 'landing.billingItem2', 'landing.billingItem3'],
    overviewKey: 'landing.module.billing.overview',
    detailKeys: [
      'landing.module.billing.detail1',
      'landing.module.billing.detail2',
      'landing.module.billing.detail3',
      'landing.module.billing.detail4',
      'landing.module.billing.detail5',
      'landing.module.billing.detail6',
    ],
  },
  {
    id: 'finance',
    nameKey: 'nav.finance',
    color: 'amber',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    descKey: 'landing.financeDesc',
    itemKeys: ['landing.financeItem1', 'landing.financeItem2', 'landing.financeItem3'],
    overviewKey: 'landing.module.finance.overview',
    detailKeys: [
      'landing.module.finance.detail1',
      'landing.module.finance.detail2',
      'landing.module.finance.detail3',
      'landing.module.finance.detail4',
      'landing.module.finance.detail5',
      'landing.module.finance.detail6',
    ],
  },
  {
    id: 'team',
    nameKey: 'nav.team',
    color: 'red',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    descKey: 'landing.teamDesc',
    itemKeys: ['landing.teamItem1', 'landing.teamItem2', 'landing.teamItem3'],
    overviewKey: 'landing.module.team.overview',
    detailKeys: [
      'landing.module.team.detail1',
      'landing.module.team.detail2',
      'landing.module.team.detail3',
      'landing.module.team.detail4',
      'landing.module.team.detail5',
      'landing.module.team.detail6',
    ],
  },
]

export function getModuleColorClasses(color: LandingModuleColor) {
  switch (color) {
    case 'cyan':
      return {
        icon: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400',
        check: 'text-cyan-500',
        accent: 'hover:border-cyan-400 dark:hover:border-cyan-600',
        header: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
      }
    case 'emerald':
      return {
        icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
        check: 'text-emerald-500',
        accent: 'hover:border-emerald-400 dark:hover:border-emerald-600',
        header: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
      }
    case 'violet':
      return {
        icon: 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400',
        check: 'text-violet-500',
        accent: 'hover:border-violet-400 dark:hover:border-violet-600',
        header: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
      }
    case 'blue':
      return {
        icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
        check: 'text-blue-500',
        accent: 'hover:border-blue-400 dark:hover:border-blue-600',
        header: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      }
    case 'amber':
      return {
        icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
        check: 'text-amber-500',
        accent: 'hover:border-amber-400 dark:hover:border-amber-600',
        header: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
      }
    default:
      return {
        icon: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400',
        check: 'text-red-500',
        accent: 'hover:border-red-400 dark:hover:border-red-600',
        header: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
      }
  }
}
