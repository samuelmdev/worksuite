import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'
import {
  getStripe,
  isStripeConfigured,
  STRIPE_PRICES,
  assertPricesConfigured,
  billableSeats,
  getAppUrl,
  type BillingInterval,
} from '../../../../lib/stripe'

/**
 * Starts a Stripe Checkout session for an organization's subscription.
 *
 * Only an org admin may subscribe. The caller's identity and role are verified
 * server-side; the organization id in the body is never trusted on its own.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing is not configured yet' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: caller, error: callerError } = await supabaseAdmin.auth.getUser(token)
  if (callerError || !caller?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { organizationId?: string; interval?: BillingInterval }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const organizationId = body.organizationId?.trim()
  const interval = body.interval

  if (!organizationId || (interval !== 'monthly' && interval !== 'annual')) {
    return NextResponse.json(
      { error: 'organizationId and a valid interval are required' },
      { status: 400 }
    )
  }

  try {
    assertPricesConfigured(interval)
  } catch (error) {
    console.error('Stripe checkout: prices not configured', error)
    return NextResponse.json({ error: 'Billing is not configured yet' }, { status: 503 })
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', caller.user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (membershipError) {
    console.error('Stripe checkout: membership lookup failed', membershipError)
    return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
  }

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  const { data: organization, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, email, stripe_customer_id')
    .eq('id', organizationId)
    .maybeSingle()

  if (orgError || !organization) {
    console.error('Stripe checkout: organization lookup failed', orgError)
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Seat count drives the metered portion of the subscription.
  const { count: memberCount } = await supabaseAdmin
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const extraSeats = billableSeats(memberCount ?? 1)

  try {
    // Reuse the customer if this organization has subscribed before, so
    // payment methods and invoice history stay on one record.
    let customerId = organization.stripe_customer_id

    if (!customerId) {
      const customer = await getStripe().customers.create({
        name: organization.name,
        email: organization.email ?? caller.user.email ?? undefined,
        metadata: { organization_id: organizationId },
      })
      customerId = customer.id

      await supabaseAdmin
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organizationId)
    }

    const prices = STRIPE_PRICES[interval]
    const lineItems: { price: string; quantity: number }[] = [
      { price: prices.base, quantity: 1 },
    ]
    if (extraSeats > 0) {
      lineItems.push({ price: prices.seat, quantity: extraSeats })
    }

    const appUrl = getAppUrl()
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: lineItems,
      success_url: `${appUrl}/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/settings/billing?checkout=cancelled`,
      // Echoed back on the webhook so the subscription can be attributed
      // without trusting anything from the browser.
      subscription_data: {
        metadata: { organization_id: organizationId, billing_interval: interval },
      },
      metadata: { organization_id: organizationId, billing_interval: interval },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout: session creation failed', error)
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
