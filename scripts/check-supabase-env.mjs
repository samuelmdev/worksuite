#!/usr/bin/env node
/**
 * Verifies the Supabase URL and keys in .env.local.
 *
 *   node scripts/check-supabase-env.mjs
 *
 * Checks, in order of how often each one is actually the problem:
 *   1. The keys authenticate against the project (live call)
 *   2. Each key's `ref` claim matches the project in the URL — keys from
 *      another Supabase project are structurally valid and fail with a
 *      misleading "Invalid API key"
 *   3. The anon and service-role keys are not swapped — a service_role key
 *      in a NEXT_PUBLIC_ var hands full database access to every browser
 *      and bypasses every RLS policy
 *
 * Never prints a full key. No dependencies.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ENV_FILE = resolve(process.cwd(), '.env.local')

const RESET = '\x1b[0m'
const colour = (c, s) => `${c}${s}${RESET}`
const red = (s) => colour('\x1b[31m', s)
const green = (s) => colour('\x1b[32m', s)
const yellow = (s) => colour('\x1b[33m', s)
const dim = (s) => colour('\x1b[2m', s)

let failures = 0
let warnings = 0

const pass = (msg, detail) => console.log(`${green('PASS')}  ${msg}${detail ? dim(`  ${detail}`) : ''}`)
const fail = (msg, detail) => { failures++; console.log(`${red('FAIL')}  ${msg}${detail ? `\n       ${detail}` : ''}`) }
const warn = (msg, detail) => { warnings++; console.log(`${yellow('WARN')}  ${msg}${detail ? `\n       ${detail}` : ''}`) }

/** Masked form, so output can be pasted into an issue without leaking anything. */
const mask = (value) =>
  !value ? '(empty)' : value.length <= 16 ? `${value.slice(0, 4)}…` : `${value.slice(0, 8)}…${value.slice(-4)}`

function readEnv() {
  let raw
  try {
    raw = readFileSync(ENV_FILE, 'utf8')
  } catch {
    console.error(red(`Cannot read ${ENV_FILE}`))
    console.error('Create it from SUPABASE_SETUP.md, then run this again.')
    process.exit(2)
  }

  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    // Strip surrounding quotes; Supabase never includes them but people paste them.
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
  return env
}

/** Decodes a Supabase JWT payload. Returns null for the newer sb_* key format. */
function decodeJwt(key) {
  const parts = key.split('.')
  if (parts.length !== 3) return null
  try {
    const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname
    // <ref>.supabase.co — self-hosted and custom domains will not match this.
    const match = host.match(/^([a-z0-9]+)\.supabase\.(co|in)$/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}

async function main() {
  const env = readEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  console.log(dim(`Reading ${ENV_FILE}\n`))

  // ---------------------------------------------------------------- present --
  if (!url) fail('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!anonKey) fail('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  if (!serviceKey) warn('SUPABASE_SERVICE_ROLE_KEY is not set', 'Team invites and the Stripe webhook need it.')
  if (!url || !anonKey) return summarise()

  // ------------------------------------------------------------------- shape --
  if (/placeholder/i.test(url) || /placeholder/i.test(anonKey)) {
    fail('Still using placeholder values', 'Replace them with the real project credentials from the Supabase dashboard.')
    return summarise()
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    fail('NEXT_PUBLIC_SUPABASE_URL is not a valid URL', `Got: ${url}`)
    return summarise()
  }

  if (parsed.protocol !== 'https:') {
    warn(`URL is ${parsed.protocol}//, expected https://`, 'Fine for local Supabase, wrong for a hosted project.')
  }
  if (parsed.pathname !== '/') {
    fail('URL has a path on it', `Use just the origin: ${parsed.origin}`)
  }

  const urlRef = projectRefFromUrl(url)
  pass('URL parses', urlRef ? `project ref: ${urlRef}` : `host: ${parsed.hostname}`)

  // -------------------------------------------------------- key claims / role --
  const checkKey = (label, key, expectedRole) => {
    const claims = decodeJwt(key)

    if (!claims) {
      // Newer sb_publishable_* / sb_secret_* keys are opaque, not JWTs.
      if (/^sb_(publishable|secret)_/.test(key)) {
        const isSecret = key.startsWith('sb_secret_')
        if (expectedRole === 'anon' && isSecret) {
          fail(`${label} is a SECRET key in a public variable`,
            red('This exposes full database access to the browser. Swap the two keys.'))
        } else if (expectedRole === 'service_role' && !isSecret) {
          fail(`${label} is a publishable key, expected a secret key`)
        } else {
          pass(`${label} format looks right`, `${mask(key)} (new-style key, claims not inspectable)`)
        }
        return
      }
      fail(`${label} is not a recognised Supabase key`, `Got: ${mask(key)}`)
      return
    }

    if (claims.role !== expectedRole) {
      if (expectedRole === 'anon' && claims.role === 'service_role') {
        fail(`${label} contains a SERVICE_ROLE key`,
          red('This is in a NEXT_PUBLIC_ variable, so it ships to the browser and bypasses every RLS policy. Swap the two keys and rotate this one in the dashboard.'))
      } else {
        fail(`${label} has role "${claims.role}", expected "${expectedRole}"`)
      }
    } else {
      pass(`${label} role is ${expectedRole}`, mask(key))
    }

    if (urlRef && claims.ref && claims.ref !== urlRef) {
      fail(`${label} belongs to a different project`,
        `Key ref: ${claims.ref}\n       URL ref: ${urlRef}\n       ` +
        'Both are valid on their own, which is why this shows up as "Invalid API key".')
    } else if (urlRef && claims.ref) {
      pass(`${label} ref matches the URL`, claims.ref)
    }

    if (claims.exp && claims.exp * 1000 < Date.now()) {
      fail(`${label} expired on ${new Date(claims.exp * 1000).toISOString().split('T')[0]}`)
    }
  }

  checkKey('ANON_KEY', anonKey, 'anon')
  if (serviceKey && !/placeholder/i.test(serviceKey)) {
    checkKey('SERVICE_ROLE_KEY', serviceKey, 'service_role')
  }

  // -------------------------------------------------------------- live calls --
  console.log(dim('\nContacting the project…\n'))

  /**
   * AbortSignal.timeout leaves a live timer handle that crashes Node on
   * Windows at exit (libuv UV_HANDLE_CLOSING assertion), so the timer is
   * cleared explicitly instead.
   */
  async function request(path, key, extraHeaders = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch(`${parsed.origin}${path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, ...extraHeaders },
        signal: controller.signal,
      })
      return { res, body: await res.text().catch(() => '') }
    } finally {
      clearTimeout(timer)
    }
  }

  function describeNetworkError(error) {
    const msg = String(error?.cause?.code || error?.name || error)
    if (/ENOTFOUND|EAI_AGAIN/.test(msg)) {
      return ['Hostname does not resolve', `Check the URL. A deleted project also stops resolving.\n       (${msg})`]
    }
    if (/Timeout|AbortError/.test(msg)) {
      return ['Request timed out', 'A paused Supabase project behaves like this. Resume it in the dashboard.']
    }
    return ['Could not reach the project', msg]
  }

  // GoTrue accepts the anon key, so this proves reachability + a valid key
  // without needing any table to exist yet.
  let reachable = false
  try {
    const { res, body } = await request('/auth/v1/health', anonKey)
    if (res.ok) {
      reachable = true
      const version = (() => { try { return JSON.parse(body).version } catch { return null } })()
      pass('Project is reachable and accepted the anon key', version ? `auth ${version}` : `HTTP ${res.status}`)
    } else if (res.status === 401) {
      fail('Project rejected the anon key (HTTP 401)',
        body.slice(0, 200) || 'Key does not belong to this project, or has been rotated.')
    } else {
      warn(`Auth health returned HTTP ${res.status}`, body.slice(0, 160))
    }
  } catch (error) {
    const [msg, detail] = describeNetworkError(error)
    fail(msg, detail)
  }

  // Does the schema actually exist? PostgREST answers 404/PGRST205 for a
  // missing table, and 200 with [] when RLS simply filters everything out.
  if (reachable) {
    try {
      const { res, body } = await request(
        '/rest/v1/organizations?select=id&limit=1',
        anonKey,
        { Accept: 'application/json' }
      )

      if (res.ok) {
        pass('Database responds and the schema is present', 'queried public.organizations')
      } else if (res.status === 404 || /PGRST205|PGRST202/.test(body)) {
        fail('Connected, but the schema is missing',
          'public.organizations does not exist. Run the migrations:\n' +
          '       migrations/001_consolidate_schema.sql, then 003_… (see migrations/README.md)')
      } else if (res.status === 401 || res.status === 403) {
        warn(`Table query returned HTTP ${res.status}`,
          'Key is valid but RLS denies anonymous reads, which is expected before sign-in.')
      } else {
        warn(`Table query returned HTTP ${res.status}`, body.slice(0, 200))
      }
    } catch (error) {
      const [msg, detail] = describeNetworkError(error)
      warn(msg, detail)
    }
  }

  // ------------------------------------------------------------ service key --
  if (!serviceKey || /placeholder/i.test(serviceKey)) {
    warn('SUPABASE_SERVICE_ROLE_KEY is still a placeholder',
      'Team invites and the Stripe webhook need it. Settings → API → service_role.')
  } else if (reachable) {
    try {
      const { res, body } = await request('/auth/v1/admin/users?page=1&per_page=1', serviceKey)
      if (res.ok) {
        pass('Service-role key authenticates', `HTTP ${res.status}`)
      } else {
        fail(`Service-role key rejected (HTTP ${res.status})`,
          body.slice(0, 160) || 'Needed for team invites and the Stripe webhook.')
      }
    } catch (error) {
      warn('Could not verify the service-role key', String(error?.cause?.code || error))
    }
  }

  summarise()
}

function summarise() {
  console.log('')
  if (failures > 0) {
    console.log(red(`${failures} check(s) failed`) + (warnings ? yellow(`, ${warnings} warning(s)`) : ''))
    process.exit(1)
  }
  console.log(green('All checks passed') + (warnings ? yellow(`, ${warnings} warning(s)`) : ''))
}

main()
