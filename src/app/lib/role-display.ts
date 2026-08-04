import { Crown, Shield, TrendingUp, User } from 'lucide-react'
import type { Role } from '../../lib/module-access'
import type { TranslationKey } from './translations'

/**
 * Single source for how each role is labelled and styled. Kept here so adding a
 * role means touching one file rather than every table and badge.
 */
export const ROLE_ICON: Record<Role, typeof User> = {
  admin: Crown,
  manager: Shield,
  sales_rep: TrendingUp,
  employee: User,
}

export const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  sales_rep: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  employee: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
}

export const ROLE_LABEL_KEY: Record<Role, TranslationKey> = {
  admin: 'settings.role.admin',
  manager: 'settings.role.manager',
  sales_rep: 'settings.role.salesRep',
  employee: 'settings.role.member',
}

export function roleIcon(role: string) {
  return ROLE_ICON[role as Role] ?? User
}

export function roleBadgeClass(role: string) {
  return ROLE_BADGE_CLASS[role as Role] ?? ROLE_BADGE_CLASS.employee
}

export function roleLabelKey(role: string): TranslationKey {
  return ROLE_LABEL_KEY[role as Role] ?? ROLE_LABEL_KEY.employee
}
