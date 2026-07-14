import { supabase } from './supabase'

export interface TeamMember {
  id: string
  user_id: string
  organization_id: string
  role: 'admin' | 'manager' | 'employee'
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
      employees: members.filter(m => m.role === 'employee').length,
    }
  }

  static async updateMemberRole(
    memberId: string,
    organizationId: string,
    role: TeamMember['role']
  ): Promise<void> {
    const { data: member, error: fetchError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError || !member) {
      console.error('Error fetching member for role update:', fetchError?.message, fetchError)
      throw new Error('Failed to update member role')
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

    // Keep auth membership in sync for app permissions / nav
    await supabase
      .from('user_organizations')
      .update({ role })
      .eq('user_id', member.user_id)
      .eq('organization_id', organizationId)
  }
}
