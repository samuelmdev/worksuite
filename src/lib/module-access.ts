/** Every role the application understands, in descending order of privilege. */
export const ROLES = ['admin', 'manager', 'sales_rep', 'employee'] as const

export type Role = (typeof ROLES)[number]

/** Roles allowed to read and write CRM records (clients, pipeline, contracts). */
export const SELLING_ROLES: Role[] = ['admin', 'manager', 'sales_rep']

/** Roles allowed to manage delivery: projects, approvals, team. */
export const MANAGING_ROLES: Role[] = ['admin', 'manager']

const ALL_ROLES: Role[] = [...ROLES]

/** Allowed roles per module route — keep in sync with page-level RoleGuard rules. */
export function getAllowedRolesForPath(pathname: string): string[] {
  if (pathname.startsWith('/crm')) {
    // CRM configuration stays with the people who administer the workspace.
    if (pathname.startsWith('/crm/settings')) {
      return MANAGING_ROLES
    }
    if (pathname.startsWith('/crm/logs')) {
      return ALL_ROLES
    }
    if (/^\/crm\/clients\/[^/]+$/.test(pathname)) {
      return ALL_ROLES
    }
    // Clients, pipeline, contracts, tasks and reports are a sales rep's daily work.
    return SELLING_ROLES
  }

  if (pathname.startsWith('/time-tracking')) {
    return ALL_ROLES
  }

  if (pathname.startsWith('/projects')) {
    return ALL_ROLES
  }

  if (pathname.startsWith('/finance')) {
    return MANAGING_ROLES
  }

  if (pathname.startsWith('/billing')) {
    return MANAGING_ROLES
  }

  if (pathname.startsWith('/team')) {
    // Compensation is admin-only; the roster is visible to managers too.
    if (pathname.startsWith('/team/settings') || pathname.startsWith('/team/compensation')) {
      return ['admin']
    }
    return MANAGING_ROLES
  }

  return ALL_ROLES
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

/** Sales reps and above can work deals; used to gate pipeline write actions. */
export function canSell(role: string | undefined): boolean {
  return hasRoleAccess(role, SELLING_ROLES)
}

/** Managers and above; used to gate approvals, project and team administration. */
export function canManage(role: string | undefined): boolean {
  return hasRoleAccess(role, MANAGING_ROLES)
}
