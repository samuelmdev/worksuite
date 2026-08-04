import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'
import { getStripe, isStripeConfigured, getAppUrl } from '../../../../lib/stripe'

/**
 * Opens the Stripe billing portal so an admin can change payment method,
 * switch between monthly and annual, or cancel — without us rebuilding any of
 * that UI. Admin-only, verified server-side.
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

  let body: { organizationId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const organizationId = body.organizationId?.trim()
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
  }

  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', caller.user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  const { data: organization } = await supabaseAdmin
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', organizationId)
    .maybeSingle()

  const customerId = (organization as { stripe_customer_id: string | null } | null)
    ?.stripe_customer_id

  if (!customerId) {
    return NextResponse.json({ error: 'No subscription to manage' }, { status: 404 })
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl()}/settings/billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe portal: session creation failed', error)
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 })
  }
}
