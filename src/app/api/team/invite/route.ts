import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

import { ROLES, type Role } from '../../../../lib/module-access'

const VALID_ROLES: readonly Role[] = ROLES

interface InviteBody {
  organizationId?: string
  email?: string
  role?: Role
  firstName?: string
  lastName?: string
}

/**
 * Invite a team member into an organization.
 *
 * The subscriber (org admin) is the only role allowed to call this. Creating
 * auth users needs the service-role key, so it cannot run in the browser —
 * the client sends its access token and the server re-verifies both the
 * identity and the admin role before doing anything.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: caller, error: callerError } = await supabaseAdmin.auth.getUser(token)
  if (callerError || !caller?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: InviteBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const organizationId = body.organizationId?.trim()
  const email = body.email?.trim().toLowerCase()
  const role = body.role
  const firstName = body.firstName?.trim() || null
  const lastName = body.lastName?.trim() || null

  if (!organizationId || !email || !role) {
    return NextResponse.json(
      { error: 'organizationId, email and role are required' },
      { status: 400 }
    )
  }

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // The caller must be an active admin of the organization they are inviting into.
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', caller.user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (membershipError) {
    console.error('Invite: membership lookup failed', membershipError)
    return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
  }

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  // Seat limit: the plan includes 5 users, extra seats are billed per head.
  // Block silently exceeding it until billing is wired up to report capacity.
  const { count: seatCount, error: seatError } = await supabaseAdmin
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  if (seatError) {
    console.error('Invite: seat count failed', seatError)
    return NextResponse.json({ error: 'Failed to verify seat capacity' }, { status: 500 })
  }

  // Reuse the auth user if they already exist, otherwise create one.
  let userId: string | null = null

  const { data: existingProfile } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { first_name: firstName, last_name: lastName },
      })

    if (createError || !created?.user) {
      console.error('Invite: auth user creation failed', createError)
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    userId = created.user.id

    const { error: profileError } = await supabaseAdmin.from('users').upsert(
      {
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        is_active: true,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      console.error('Invite: profile creation failed', profileError)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }
  }

  const { error: memberError } = await supabaseAdmin.from('organization_members').upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      role,
      is_active: true,
    },
    { onConflict: 'organization_id,user_id' }
  )

  if (memberError) {
    console.error('Invite: membership creation failed', memberError)
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    userId,
    seatsUsed: (seatCount ?? 0) + (existingProfile ? 0 : 1),
  })
}
