'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from './auth-context-multi-org'
import { getAllowedRolesForPath, hasRoleAccess, filterNavByRole } from '../../lib/module-access'

export function useModuleAccess() {
  const pathname = usePathname()
  const { user, currentOrganization, isLoading } = useAuth()
  const allowedRoles = getAllowedRolesForPath(pathname)
  const hasAccess =
    !!user && hasRoleAccess(currentOrganization?.role, allowedRoles)

  return { hasAccess, isLoading, allowedRoles, role: currentOrganization?.role }
}

export function useAccessibleNavItems<T extends { href: string }>(
  items: T[],
  options?: { showAllWhenLoggedOut?: boolean }
): T[] {
  const { user, currentOrganization } = useAuth()
  if (!user) return options?.showAllWhenLoggedOut ? items : []
  return filterNavByRole(items, currentOrganization?.role)
}
