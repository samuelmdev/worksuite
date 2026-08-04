'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './auth-context-multi-org'
import {
  SubscriptionClient,
  type OrganizationSubscription,
  type SeatUsage,
} from '../../lib/subscription-client'

/**
 * Real subscription state for the current organization.
 *
 * WorkSuite sells one plan that includes every module, so this does not gate
 * modules against tiers — it reports whether the organization is entitled to
 * the product at all, and how many seats it is using.
 */
export function useSubscription() {
  const { currentOrganization } = useAuth()
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null)
  const [seats, setSeats] = useState<SeatUsage>({ used: 0, included: 5, billable_extra: 0 })
  const [isLoading, setIsLoading] = useState(true)

  const organizationId = currentOrganization?.id

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!organizationId) {
        setSubscription(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const [sub, usage] = await Promise.all([
          SubscriptionClient.getSubscription(organizationId),
          SubscriptionClient.getSeatUsage(organizationId),
        ])
        if (!cancelled) {
          setSubscription(sub)
          setSeats(usage)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [organizationId])

  const isEntitled = SubscriptionClient.isEntitled(subscription)

  return {
    subscription,
    seats,
    isLoading,
    isEntitled,
    /** Every module ships in the single plan; entitlement is all that matters. */
    hasModule: () => isEntitled,
    refresh: async () => {
      if (!organizationId) return
      const [sub, usage] = await Promise.all([
        SubscriptionClient.getSubscription(organizationId),
        SubscriptionClient.getSeatUsage(organizationId),
      ])
      setSubscription(sub)
      setSeats(usage)
    },
  }
}
