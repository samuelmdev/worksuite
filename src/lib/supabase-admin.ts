import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Database } from './supabase'

/**
 * Service-role Supabase client for server-side work that must bypass RLS —
 * creating invited users, and applying Stripe webhook results.
 *
 * Never import this from a client component.
 *
 * Built lazily behind a Proxy: constructing it at module load would fail
 * `next build` on any machine without the service-role key, and route files
 * import it at the top level.
 */
let adminClient: SupabaseClient<Database> | null = null

function getSupabaseAdmin(): SupabaseClient<Database> {
  if (adminClient) return adminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase admin environment variables. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY in .env.local — see SUPABASE_SETUP.md.'
    )
  }

  adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  return adminClient
}

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, property, receiver) {
    return Reflect.get(getSupabaseAdmin(), property, receiver)
  },
})
