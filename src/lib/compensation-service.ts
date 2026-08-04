import { supabase } from './supabase'
import type { Role } from './module-access'

/**
 * Compensation is role-shaped:
 *   employee  — paid by tracked hours, or a fixed salary; bonuses possible
 *   manager   — salary, may also earn commission; bonuses possible
 *   sales_rep — commission-driven, optional base salary; bonuses possible
 *
 * Rather than model three rigid variants, a record carries a base type plus
 * independent commission eligibility, which covers every combination above and
 * anything in between.
 */
export type BaseCompensationType = 'hourly' | 'salary' | 'none'

export interface MemberCompensation {
  id: string
  organization_id: string
  user_id: string
  base_type: BaseCompensationType
  /** Set when base_type = 'hourly'. */
  hourly_rate: number | null
  /** Set when base_type = 'salary'. Stored as the amount per pay period. */
  salary_amount: number | null
  salary_period: 'monthly' | 'annual' | null
  currency: string
  is_commission_eligible: boolean
  /** Overrides the organization default rule when set. */
  commission_rule_id: string | null
  effective_from: string
  effective_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type MemberCompensationFormData = Omit<
  MemberCompensation,
  'id' | 'created_at' | 'updated_at'
>

export type CommissionCalcType = 'percentage' | 'flat' | 'percentage_capped'

export interface CommissionRule {
  id: string
  organization_id: string
  name: string
  calc_type: CommissionCalcType
  /** Percent of deal value, for 'percentage' and 'percentage_capped'. */
  percentage: number | null
  /** Fixed payout, for 'flat'. */
  flat_amount: number | null
  /** Floor and ceiling, applied only for 'percentage_capped'. */
  min_amount: number | null
  max_amount: number | null
  /** Restricts the rule to one role; null means it can apply to anyone. */
  applies_to_role: Role | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CommissionRuleFormData = Omit<
  CommissionRule,
  'id' | 'created_at' | 'updated_at'
>

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled'

export interface Commission {
  id: string
  organization_id: string
  user_id: string
  pipeline_item_id: string | null
  client_id: string | null
  rule_id: string | null
  deal_value: number
  amount: number
  currency: string
  status: CommissionStatus
  earned_at: string
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  /** Joined for display; not a stored column. */
  user_name?: string
  deal_title?: string
}

export interface BonusEntry {
  id: string
  organization_id: string
  user_id: string
  amount: number
  currency: string
  reason: string
  period: string | null
  status: 'pending' | 'approved' | 'paid' | 'cancelled'
  awarded_by: string | null
  paid_at: string | null
  created_at: string
  user_name?: string
}

export interface CompensationSummary {
  user_id: string
  name: string
  role: Role
  base_type: BaseCompensationType
  base_amount: number | null
  currency: string
  /** Hours logged in the period; only meaningful for hourly members. */
  tracked_hours: number
  /** hourly_rate x tracked_hours, or the salary for the period. */
  earned_base: number
  earned_commission: number
  earned_bonus: number
  total: number
}

/**
 * Applies a rule to a deal value. Kept pure and exported so the same maths runs
 * in the UI preview and when a commission is actually recorded.
 */
export function calculateCommission(rule: CommissionRule, dealValue: number): number {
  let amount: number

  switch (rule.calc_type) {
    case 'flat':
      amount = rule.flat_amount ?? 0
      break
    case 'percentage':
      amount = (dealValue * (rule.percentage ?? 0)) / 100
      break
    case 'percentage_capped':
      amount = (dealValue * (rule.percentage ?? 0)) / 100
      if (rule.min_amount !== null) amount = Math.max(amount, rule.min_amount)
      if (rule.max_amount !== null) amount = Math.min(amount, rule.max_amount)
      break
    default:
      amount = 0
  }

  return Math.round(amount * 100) / 100
}

export class CompensationService {
  // ---------------------------------------------------------------- rules ---

  static async getRules(organizationId: string): Promise<CommissionRule[]> {
    const { data, error } = await supabase
      .from('commission_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching commission rules:', error)
      throw new Error('Failed to fetch commission rules')
    }
    return (data as CommissionRule[]) || []
  }

  static async createRule(rule: CommissionRuleFormData): Promise<CommissionRule> {
    if (rule.is_default) {
      await this.clearDefaultRule(rule.organization_id)
    }

    const { data, error } = await supabase
      .from('commission_rules')
      .insert([rule])
      .select()
      .single()

    if (error) {
      console.error('Error creating commission rule:', error)
      throw new Error('Failed to create commission rule')
    }
    return data as CommissionRule
  }

  static async updateRule(
    id: string,
    organizationId: string,
    updates: Partial<CommissionRuleFormData>
  ): Promise<CommissionRule> {
    if (updates.is_default) {
      await this.clearDefaultRule(organizationId, id)
    }

    const { data, error } = await supabase
      .from('commission_rules')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating commission rule:', error)
      throw new Error('Failed to update commission rule')
    }
    return data as CommissionRule
  }

  static async deleteRule(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('commission_rules')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error deleting commission rule:', error)
      throw new Error('Failed to delete commission rule')
    }
  }

  /** Only one rule per organization may be the default. */
  private static async clearDefaultRule(organizationId: string, exceptId?: string): Promise<void> {
    let query = supabase
      .from('commission_rules')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('is_default', true)

    if (exceptId) query = query.neq('id', exceptId)
    await query
  }

  /** The rule that applies to a member: their override, else the role default, else the org default. */
  static async resolveRuleForUser(
    organizationId: string,
    userId: string,
    role: Role
  ): Promise<CommissionRule | null> {
    const [compensation, rules] = await Promise.all([
      this.getMemberCompensation(organizationId, userId),
      this.getRules(organizationId),
    ])

    const active = rules.filter(r => r.is_active)

    if (compensation?.commission_rule_id) {
      const override = active.find(r => r.id === compensation.commission_rule_id)
      if (override) return override
    }

    return (
      active.find(r => r.applies_to_role === role && r.is_default) ??
      active.find(r => r.applies_to_role === role) ??
      active.find(r => r.applies_to_role === null && r.is_default) ??
      null
    )
  }

  // --------------------------------------------------------- compensation ---

  static async getMemberCompensation(
    organizationId: string,
    userId: string
  ): Promise<MemberCompensation | null> {
    const { data, error } = await supabase
      .from('member_compensation')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .is('effective_to', null)
      .maybeSingle()

    if (error) {
      console.error('Error fetching member compensation:', error)
      throw new Error('Failed to fetch compensation')
    }
    return (data as MemberCompensation) ?? null
  }

  static async getAllCompensation(organizationId: string): Promise<MemberCompensation[]> {
    const { data, error } = await supabase
      .from('member_compensation')
      .select('*')
      .eq('organization_id', organizationId)
      .is('effective_to', null)

    if (error) {
      console.error('Error fetching compensation records:', error)
      throw new Error('Failed to fetch compensation')
    }
    return (data as MemberCompensation[]) || []
  }

  /**
   * Records a new compensation arrangement. The previous one is closed off
   * rather than overwritten, so historical payroll stays correct after a raise.
   */
  static async setMemberCompensation(
    form: MemberCompensationFormData
  ): Promise<MemberCompensation> {
    const existing = await this.getMemberCompensation(form.organization_id, form.user_id)

    if (existing) {
      const { error: closeError } = await supabase
        .from('member_compensation')
        .update({ effective_to: form.effective_from })
        .eq('id', existing.id)

      if (closeError) {
        console.error('Error closing previous compensation record:', closeError)
        throw new Error('Failed to update compensation')
      }
    }

    const { data, error } = await supabase
      .from('member_compensation')
      .insert([form])
      .select()
      .single()

    if (error) {
      console.error('Error creating compensation record:', error)
      throw new Error('Failed to update compensation')
    }
    return data as MemberCompensation
  }

  // ---------------------------------------------------------- commissions ---

  static async getCommissions(
    organizationId: string,
    filters: { userId?: string; status?: CommissionStatus; from?: string; to?: string } = {}
  ): Promise<Commission[]> {
    let query = supabase
      .from('commissions')
      .select('*, users:user_id(first_name, last_name), pipeline_items:pipeline_item_id(title)')
      .eq('organization_id', organizationId)
      .order('earned_at', { ascending: false })

    if (filters.userId) query = query.eq('user_id', filters.userId)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.from) query = query.gte('earned_at', filters.from)
    if (filters.to) query = query.lte('earned_at', filters.to)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching commissions:', error)
      throw new Error('Failed to fetch commissions')
    }

    return ((data as any[]) || []).map(row => ({
      ...row,
      user_name: row.users
        ? `${row.users.first_name || ''} ${row.users.last_name || ''}`.trim() || 'Unknown'
        : 'Unknown',
      deal_title: row.pipeline_items?.title ?? null,
    })) as Commission[]
  }

  /**
   * Records commission for a deal that has just been won.
   *
   * Idempotent per pipeline item: moving a deal back out of closed-won and in
   * again must not pay the rep twice.
   */
  static async recordCommissionForWonDeal(params: {
    organizationId: string
    pipelineItemId: string
    userId: string
    role: Role
    dealValue: number
    clientId?: string | null
    currency?: string
  }): Promise<Commission | null> {
    const {
      organizationId, pipelineItemId, userId, role, dealValue,
      clientId = null, currency = 'EUR',
    } = params

    const { data: existing } = await supabase
      .from('commissions')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('pipeline_item_id', pipelineItemId)
      .neq('status', 'cancelled')
      .maybeSingle()

    if (existing) return null

    const compensation = await this.getMemberCompensation(organizationId, userId)
    if (compensation && !compensation.is_commission_eligible) return null

    const rule = await this.resolveRuleForUser(organizationId, userId, role)
    if (!rule) return null

    const amount = calculateCommission(rule, dealValue)
    if (amount <= 0) return null

    const { data, error } = await supabase
      .from('commissions')
      .insert([{
        organization_id: organizationId,
        user_id: userId,
        pipeline_item_id: pipelineItemId,
        client_id: clientId,
        rule_id: rule.id,
        deal_value: dealValue,
        amount,
        currency,
        status: 'pending',
        earned_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) {
      console.error('Error recording commission:', error)
      throw new Error('Failed to record commission')
    }
    return data as Commission
  }

  static async updateCommissionStatus(
    id: string,
    organizationId: string,
    status: CommissionStatus,
    approverId?: string
  ): Promise<void> {
    const updates: Record<string, unknown> = { status }

    if (status === 'approved') {
      updates.approved_by = approverId ?? null
      updates.approved_at = new Date().toISOString()
    }
    if (status === 'paid') {
      updates.paid_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('commissions')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error updating commission status:', error)
      throw new Error('Failed to update commission')
    }
  }

  // --------------------------------------------------------------- bonuses ---

  static async getBonuses(organizationId: string, userId?: string): Promise<BonusEntry[]> {
    let query = supabase
      .from('bonuses')
      .select('*, users:user_id(first_name, last_name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching bonuses:', error)
      throw new Error('Failed to fetch bonuses')
    }

    return ((data as any[]) || []).map(row => ({
      ...row,
      user_name: row.users
        ? `${row.users.first_name || ''} ${row.users.last_name || ''}`.trim() || 'Unknown'
        : 'Unknown',
    })) as BonusEntry[]
  }

  static async createBonus(bonus: {
    organization_id: string
    user_id: string
    amount: number
    currency?: string
    reason: string
    period?: string | null
    awarded_by?: string | null
  }): Promise<BonusEntry> {
    const { data, error } = await supabase
      .from('bonuses')
      .insert([{ ...bonus, currency: bonus.currency ?? 'EUR', status: 'pending' }])
      .select()
      .single()

    if (error) {
      console.error('Error creating bonus:', error)
      throw new Error('Failed to create bonus')
    }
    return data as BonusEntry
  }

  static async updateBonusStatus(
    id: string,
    organizationId: string,
    status: BonusEntry['status']
  ): Promise<void> {
    const updates: Record<string, unknown> = { status }
    if (status === 'paid') updates.paid_at = new Date().toISOString()

    const { error } = await supabase
      .from('bonuses')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error updating bonus:', error)
      throw new Error('Failed to update bonus')
    }
  }

  // --------------------------------------------------------------- summary ---

  /**
   * What each member earned over a period: base pay (hours x rate, or the
   * salary), plus approved commission and bonuses.
   */
  static async getCompensationSummary(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<CompensationSummary[]> {
    const [membersResult, compensationRecords, commissions, bonuses, timeEntries] =
      await Promise.all([
        supabase
          .from('organization_members')
          .select('user_id, role, users:user_id(first_name, last_name)')
          .eq('organization_id', organizationId)
          .eq('is_active', true),
        this.getAllCompensation(organizationId),
        this.getCommissions(organizationId, { from: startDate, to: endDate }),
        this.getBonuses(organizationId),
        supabase
          .from('time_entries')
          .select('user_id, billable_hours, duration_minutes')
          .eq('organization_id', organizationId)
          .eq('status', 'approved')
          .gte('start_time', startDate)
          .lte('start_time', `${endDate}T23:59:59`),
      ])

    if (membersResult.error) {
      console.error('Error fetching members for summary:', membersResult.error)
      throw new Error('Failed to build compensation summary')
    }

    const compensationByUser = new Map(compensationRecords.map(c => [c.user_id, c]))

    const hoursByUser = new Map<string, number>()
    for (const entry of ((timeEntries.data as any[]) || [])) {
      const hours = entry.billable_hours ?? (entry.duration_minutes ?? 0) / 60
      hoursByUser.set(entry.user_id, (hoursByUser.get(entry.user_id) ?? 0) + hours)
    }

    const commissionByUser = new Map<string, number>()
    for (const c of commissions) {
      if (c.status === 'cancelled' || c.status === 'pending') continue
      commissionByUser.set(c.user_id, (commissionByUser.get(c.user_id) ?? 0) + c.amount)
    }

    const bonusByUser = new Map<string, number>()
    for (const b of bonuses) {
      if (b.status === 'cancelled' || b.status === 'pending') continue
      bonusByUser.set(b.user_id, (bonusByUser.get(b.user_id) ?? 0) + b.amount)
    }

    return ((membersResult.data as any[]) || []).map(member => {
      const comp = compensationByUser.get(member.user_id)
      const trackedHours = Math.round((hoursByUser.get(member.user_id) ?? 0) * 100) / 100
      const earnedCommission = commissionByUser.get(member.user_id) ?? 0
      const earnedBonus = bonusByUser.get(member.user_id) ?? 0

      let earnedBase = 0
      let baseAmount: number | null = null

      if (comp?.base_type === 'hourly') {
        baseAmount = comp.hourly_rate
        earnedBase = trackedHours * (comp.hourly_rate ?? 0)
      } else if (comp?.base_type === 'salary') {
        baseAmount = comp.salary_amount
        // Annual figures are reported per month to match the period view.
        earnedBase =
          comp.salary_period === 'annual'
            ? (comp.salary_amount ?? 0) / 12
            : comp.salary_amount ?? 0
      }

      const name =
        `${member.users?.first_name || ''} ${member.users?.last_name || ''}`.trim() || 'Unknown'

      return {
        user_id: member.user_id,
        name,
        role: member.role as Role,
        base_type: comp?.base_type ?? 'none',
        base_amount: baseAmount,
        currency: comp?.currency ?? 'EUR',
        tracked_hours: trackedHours,
        earned_base: Math.round(earnedBase * 100) / 100,
        earned_commission: Math.round(earnedCommission * 100) / 100,
        earned_bonus: Math.round(earnedBonus * 100) / 100,
        total: Math.round((earnedBase + earnedCommission + earnedBonus) * 100) / 100,
      }
    })
  }
}
