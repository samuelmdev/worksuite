/** Allowed roles per module route — keep in sync with page-level RoleGuard rules. */
export function getAllowedRolesForPath(pathname: string): string[] {
  if (pathname.startsWith('/crm')) {
    if (pathname.startsWith('/crm/logs')) {
      return ['admin', 'manager', 'employee']
    }
    if (/^\/crm\/clients\/[^/]+$/.test(pathname)) {
      return ['admin', 'manager', 'employee']
    }
    return ['admin', 'manager']
  }

  if (pathname.startsWith('/time-tracking')) {
    return ['admin', 'manager', 'employee']
  }

  if (pathname.startsWith('/projects')) {
    return ['admin', 'manager', 'employee']
  }

  if (pathname.startsWith('/billing')) {
    return ['admin', 'manager']
  }

  if (pathname.startsWith('/team')) {
    if (pathname.startsWith('/team/settings')) {
      return ['admin']
    }
    return ['admin', 'manager']
  }

  return ['admin', 'manager', 'employee']
}

export function hasRoleAccess(role: string | undefined, allowedRoles: string[]): boolean {
  if (!role) return false
  return allowedRoles.includes(role)
}

export function canAccessPath(role: string | undefined, pathname: string): boolean {
  if (pathname === '/') return true
  return hasRoleAccess(role, getAllowedRolesForPath(pathname))
}

export function filterNavByRole<T extends { href: string }>(items: T[], role: string | undefined): T[] {
  return items.filter((item) => canAccessPath(role, item.href))
}
