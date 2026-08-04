import { supabase } from './supabase'

export type BillingInterval = 'monthly' | 'annual'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'

export interface OrganizationSubscription {
  id: string
  organization_id: string
  status: SubscriptionStatus
  stripe_subscription_id: string | null
  billing_interval: BillingInterval | null
  seats: number | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  cancelled_at: string | null
  trial_ends_at: string | null
}

export interface SeatUsage {
  used: number
  included: number
  billable_extra: number
}

/** Statuses that still grant access to the product. */
const ENTITLED = new Set<SubscriptionStatus>(['active', 'trialing', 'past_due'])

export const INCLUDED_SEATS = 5

export class SubscriptionClient {
  static async getSubscription(organizationId: string): Promise<OrganizationSubscription | null> {
    const { data, error } = await supabase
      .from('organization_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching subscription:', error)
      return null
    }
    return (data as OrganizationSubscription) ?? null
  }

  static async getSeatUsage(organizationId: string): Promise<SeatUsage> {
    const { count, error } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (error) {
      console.error('Error counting seats:', error)
      return { used: 0, included: INCLUDED_SEATS, billable_extra: 0 }
    }

    const used = count ?? 0
    return {
      used,
      included: INCLUDED_SEATS,
      billable_extra: Math.max(0, used - INCLUDED_SEATS),
    }
  }

  static isEntitled(subscription: OrganizationSubscription | null): boolean {
    return !!subscription && ENTITLED.has(subscription.status)
  }

  /** Sends the admin to Stripe Checkout and returns the URL to redirect to. */
  static async startCheckout(
    organizationId: string,
    interval: BillingInterval
  ): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('NOT_AUTHENTICATED')

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ organizationId, interval }),
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok || !payload.url) {
      throw new Error(payload.error || 'Failed to start checkout')
    }
    return payload.url as string
  }

  /** Opens Stripe's billing portal for payment method, plan changes and cancellation. */
  static async openBillingPortal(organizationId: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('NOT_AUTHENTICATED')

    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ organizationId }),
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok || !payload.url) {
      throw new Error(payload.error || 'Failed to open billing portal')
    }
    return payload.url as string
  }

  static async getBillingHistory(organizationId: string) {
    const { data, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('organization_id', organizationId)
      .order('paid_at', { ascending: false })
      .limit(24)

    if (error) {
      console.error('Error fetching billing history:', error)
      return []
    }
    return data || []
  }
}
