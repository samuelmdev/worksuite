import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, isStripeConfigured } from '../../../../lib/stripe'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

/**
 * Stripe webhook receiver — the authority on subscription state.
 *
 * Checkout returning success is not proof of payment; only these events are.
 * Every handler is idempotent because Stripe retries on any non-2xx response.
 */

// The raw body is required for signature verification, so the parsed body
// helpers must not run first.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RELEVANT_EVENTS = new Set<Stripe.Event['type']>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
])

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured yet' }, { status: 503 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    // A bad signature means the request did not come from Stripe.
    console.error('Stripe webhook: signature verification failed', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event)
        break
      case 'invoice.paid':
        await recordInvoicePayment(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await markPastDue(event.data.object as Stripe.Invoice)
        break
    }
  } catch (error) {
    // Returning 500 makes Stripe retry, which is what we want for a transient
    // database failure.
    console.error(`Stripe webhook: failed handling ${event.type}`, error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

/** Resolves the organization a Stripe customer belongs to. */
async function resolveOrganizationId(
  customerId: string,
  metadataOrgId?: string | null
): Promise<string | null> {
  if (metadataOrgId) return metadataOrgId

  const { data } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  return (data as { id: string } | null)?.id ?? null
}

async function syncSubscription(event: Stripe.Event): Promise<void> {
  let subscription: Stripe.Subscription

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (!session.subscription) return
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription.id
    subscription = await getStripe().subscriptions.retrieve(subscriptionId)
  } else {
    subscription = event.data.object as Stripe.Subscription
  }

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  const organizationId = await resolveOrganizationId(
    customerId,
    subscription.metadata?.organization_id
  )

  if (!organizationId) {
    console.error('Stripe webhook: could not resolve organization for customer', customerId)
    return
  }

  const item = subscription.items.data[0]
  const period = item
    ? { start: item.current_period_start, end: item.current_period_end }
    : null

  const record = {
    organization_id: organizationId,
    status: subscription.status,
    stripe_subscription_id: subscription.id,
    billing_interval:
      subscription.metadata?.billing_interval ??
      (item?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly'),
    seats: subscription.items.data.reduce((sum, i) => sum + (i.quantity ?? 0), 0),
    current_period_start: period ? new Date(period.start * 1000).toISOString() : null,
    current_period_end: period ? new Date(period.end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancelled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  }

  const { error } = await supabaseAdmin
    .from('organization_subscriptions')
    .upsert(record, { onConflict: 'organization_id' })

  if (error) {
    console.error('Stripe webhook: failed to upsert subscription', error)
    throw new Error('Failed to persist subscription')
  }
}

async function recordInvoicePayment(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  const organizationId = await resolveOrganizationId(customerId)
  if (!organizationId) return

  const amount = (invoice.amount_paid ?? 0) / 100
  const currency = (invoice.currency ?? 'eur').toUpperCase()
  const paidOn = new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000)
    .toISOString()
    .split('T')[0]

  // Idempotent on the Stripe invoice id — Stripe retries this event freely.
  const { error: historyError } = await supabaseAdmin
    .from('billing_history')
    .upsert(
      {
        organization_id: organizationId,
        stripe_invoice_id: invoice.id,
        amount,
        currency,
        status: 'paid',
        invoice_url: invoice.hosted_invoice_url ?? null,
        paid_at: new Date(
          (invoice.status_transitions?.paid_at ?? invoice.created) * 1000
        ).toISOString(),
      },
      { onConflict: 'stripe_invoice_id' }
    )

  if (historyError) {
    console.error('Stripe webhook: failed to record billing history', historyError)
    throw new Error('Failed to record payment')
  }

  // The subscription fee is an outgoing cost for the organization paying it.
  const { data: existing } = await supabaseAdmin
    .from('finance_transactions')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('source_type', 'subscription')
    .eq('source_id', invoice.id!)
    .maybeSingle()

  if (existing) return

  const { data: category } = await supabaseAdmin
    .from('finance_categories')
    .select('id')
    .eq('slug', 'software_subscription')
    .is('organization_id', null)
    .maybeSingle()

  await supabaseAdmin.from('finance_transactions').insert({
    organization_id: organizationId,
    direction: 'out',
    amount,
    currency,
    occurred_on: paidOn,
    description: `WorkSuite subscription — ${invoice.number ?? invoice.id}`,
    reference: invoice.number ?? null,
    category_id: (category as { id: string } | null)?.id ?? null,
    source_type: 'subscription',
    source_id: invoice.id,
  })
}

async function markPastDue(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  const organizationId = await resolveOrganizationId(customerId)
  if (!organizationId) return

  const { error } = await supabaseAdmin
    .from('organization_subscriptions')
    .update({ status: 'past_due' })
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Stripe webhook: failed to mark subscription past due', error)
    throw new Error('Failed to update subscription')
  }
}
