'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { AuthUser, getCurrentUser } from './auth'
import { SubscriptionService } from './subscription'

// Authentication hook
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user as AuthUser || null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

// Organization hook
export function useOrganization() {
  const [organization, setOrganization] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setOrganization(null)
      setLoading(false)
      return
    }

    const fetchOrganization = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            organization_id,
            organizations (*)
          `)
          .eq('id', user.id)
          .single()

        if (error) throw error
        setOrganization(data.organizations)
      } catch (error) {
        console.error('Error fetching organization:', error)
        setOrganization(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOrganization()
  }, [user])

  return { organization, loading }
}

// Subscription hook
export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { organization } = useOrganization()

  useEffect(() => {
    if (!organization) {
      setSubscription(null)
      setLoading(false)
      return
    }

    const fetchSubscription = async () => {
      try {
        const subscriptionData = await SubscriptionService.getSubscriptionStatus(organization.id)
        setSubscription(subscriptionData)
      } catch (error) {
        console.error('Error fetching subscription:', error)
        setSubscription(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [organization])

  return { subscription, loading }
}

// Feature access hook
export function useFeatureAccess(feature: string) {
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const { organization } = useOrganization()

  useEffect(() => {
    if (!organization) {
      setHasAccess(false)
      setLoading(false)
      return
    }

    const checkAccess = async () => {
      try {
        const access = await SubscriptionService.hasFeatureAccess(organization.id, feature)
        setHasAccess(access)
      } catch (error) {
        console.error('Error checking feature access:', error)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [organization, feature])

  return { hasAccess, loading }
}

// Real-time data hook
export function useRealtimeData<T>(
  table: string,
  filter?: { column: string; value: any }
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const { organization } = useOrganization()

  useEffect(() => {
    if (!organization) {
      setData([])
      setLoading(false)
      return
    }

    let query = supabase
      .from(table)
      .select('*')
      .eq('organization_id', organization.id)

    if (filter) {
      query = query.eq(filter.column, filter.value)
    }

    // Initial fetch
    query.then(({ data: initialData, error }) => {
      if (error) {
        console.error('Error fetching data:', error)
        return
      }
      setData(initialData || [])
      setLoading(false)
    })

    // Set up real-time subscription
    let subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData(prev => [...prev, payload.new as T])
          } else if (payload.eventType === 'UPDATE') {
            setData(prev => prev.map(item => 
              (item as any).id === payload.new.id ? payload.new as T : item
            ))
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(item => (item as any).id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [organization, table, filter])

  return { data, loading }
}
