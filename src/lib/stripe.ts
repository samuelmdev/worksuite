import Stripe from 'stripe'

/**
 * Server-side Stripe client.
 *
 * Never import this from a client component — it carries the secret key.
 * The SDK pins its own API version, so none is passed here; upgrading the
 * package is the deliberate way to move versions.
 *
 * Constructed lazily: throwing at module load would fail `next build` on any
 * machine without Stripe credentials, including CI. A missing key instead
 * surfaces as a clean error on the first request that actually needs Stripe.
 */
let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error(
      'Missing STRIPE_SECRET_KEY. Add it to .env.local — see migrations/README.md for setup.'
    )
  }

  stripeClient = new Stripe(secretKey)
  return stripeClient
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

export type BillingInterval = 'monthly' | 'annual'

/**
 * Pricing mirrors the public pricing page: a base plan covering the first
 * INCLUDED_SEATS people, plus a per-seat price for everyone beyond that.
 * Prices themselves live in Stripe; only their ids are configured here.
 */
export const INCLUDED_SEATS = 5

export const STRIPE_PRICES: Record<BillingInterval, { base: string; seat: string }> = {
  monthly: {
    base: process.env.STRIPE_PRICE_BASE_MONTHLY ?? '',
    seat: process.env.STRIPE_PRICE_SEAT_MONTHLY ?? '',
  },
  annual: {
    base: process.env.STRIPE_PRICE_BASE_ANNUAL ?? '',
    seat: process.env.STRIPE_PRICE_SEAT_ANNUAL ?? '',
  },
}

export function assertPricesConfigured(interval: BillingInterval): void {
  const prices = STRIPE_PRICES[interval]
  if (!prices.base || !prices.seat) {
    throw new Error(
      `Stripe price ids for the ${interval} plan are not configured. ` +
        'Set STRIPE_PRICE_BASE_* and STRIPE_PRICE_SEAT_* in .env.local.'
    )
  }
}

/** Seats billed on top of the base plan. */
export function billableSeats(activeMembers: number): number {
  return Math.max(0, activeMembers - INCLUDED_SEATS)
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'
  )
}
