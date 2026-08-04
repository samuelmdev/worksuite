import { supabase } from './supabase'

export interface TeamMember {
  id: string
  user_id: string
  organization_id: string
  role: 'admin' | 'manager' | 'sales_rep' | 'employee'
  joined_at: string
  is_active: boolean
  first_name: string | null
  last_name: string | null
  name: string
}

export interface TeamStats {
  total_members: number
  admins: number
  managers: number
  sales_reps: number
  employees: number
}

type MemberRow = {
  id: string
  user_id: string
  organization_id: string
  role: string
  joined_at: string
  is_active: boolean
}

type UserRow = {
  id: string
  first_name: string | null
  last_name: string | null
}

export class TeamService {
  static async getMembers(organizationId: string): Promise<TeamMember[]> {
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('id, user_id, organization_id, role, joined_at, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching organization_members:', membersError.message, membersError)
      throw new Error('Failed to fetch team members')
    }

    if (!members || members.length === 0) {
      return []
    }

    const userIds = members.map((m: MemberRow) => m.user_id)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', userIds)

    if (usersError) {
      console.error('Error fetching users for team:', usersError.message, usersError)
      throw new Error('Failed to fetch team members')
    }

    const userMap = new Map((users as UserRow[] || []).map(u => [u.id, u]))

    return (members as MemberRow[]).map(row => {
      const user = userMap.get(row.user_id)
      const name = user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'
        : 'Unknown'
      return {
        id: row.id,
        user_id: row.user_id,
        organization_id: row.organization_id,
        role: row.role as TeamMember['role'],
        joined_at: row.joined_at,
        is_active: row.is_active,
        first_name: user?.first_name ?? null,
        last_name: user?.last_name ?? null,
        name,
      }
    })
  }

  static getStats(members: TeamMember[]): TeamStats {
    return {
      total_members: members.length,
      admins: members.filter(m => m.role === 'admin').length,
      managers: members.filter(m => m.role === 'manager').length,
      sales_reps: members.filter(m => m.role === 'sales_rep').length,
      employees: members.filter(m => m.role === 'employee').length,
    }
  }

  static async updateMemberRole(
    memberId: string,
    organizationId: string,
    role: TeamMember['role']
  ): Promise<void> {
    // Never allow the last admin to be demoted — it would lock the
    // organization out of member management entirely.
    if (role !== 'admin') {
      const target = await this.getMember(memberId, organizationId)
      if (target?.role === 'admin' && (await this.countAdmins(organizationId)) <= 1) {
        throw new Error('LAST_ADMIN')
      }
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error updating member role:', error.message, error)
      throw new Error('Failed to update member role')
    }
  }

  /**
   * Invite someone into the organization by email.
   *
   * Creating auth users needs the service-role key, so this delegates to the
   * server route, which re-verifies that the caller is an org admin.
   */
  static async inviteMember(
    organizationId: string,
    email: string,
    role: TeamMember['role'],
    names?: { firstName?: string; lastName?: string }
  ): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('NOT_AUTHENTICATED')
    }

    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        organizationId,
        email,
        role,
        firstName: names?.firstName,
        lastName: names?.lastName,
      }),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      throw new Error(payload.error || 'Failed to invite team member')
    }
  }

  /** Soft-remove a member: they lose access but their history is preserved. */
  static async deactivateMember(memberId: string, organizationId: string): Promise<void> {
    const target = await this.getMember(memberId, organizationId)
    if (target?.role === 'admin' && (await this.countAdmins(organizationId)) <= 1) {
      throw new Error('LAST_ADMIN')
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ is_active: false })
      .eq('id', memberId)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error deactivating member:', error.message, error)
      throw new Error('Failed to remove team member')
    }
  }

  private static async getMember(
    memberId: string,
    organizationId: string
  ): Promise<{ user_id: string; role: TeamMember['role'] } | null> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching member:', error.message, error)
      throw new Error('Failed to load team member')
    }

    return (data as { user_id: string; role: TeamMember['role'] } | null) ?? null
  }

  private static async countAdmins(organizationId: string): Promise<number> {
    const { count, error } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('role', 'admin')
      .eq('is_active', true)

    if (error) {
      console.error('Error counting admins:', error.message, error)
      throw new Error('Failed to verify admin count')
    }

    return count ?? 0
  }
}
