'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User as SupabaseUser } from '@supabase/supabase-js'

export interface Organization {
  id: string
  name: string
  slug: string
  role: 'admin' | 'manager' | 'sales_rep' | 'employee'
  joined_at: string
}

export interface User {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  organizations: Organization[]
  currentOrganizationId: string | null
}

/**
 * Shape of an organization_members row with its organization embedded.
 * supabase-js cannot infer to-one relations without generated types, so the
 * embedded object is declared explicitly here.
 */
type MembershipRow = {
  organization_id: string
  role: Organization['role']
  joined_at: string
  organizations: { id: string; name: string; slug: string }
}

interface AuthContextType {
  user: User | null
  currentOrganization: Organization | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string, organizationName: string, organizationEmail?: string) => Promise<boolean>
  logout: () => void
  switchOrganization: (organizationId: string) => Promise<void>
  isLoading: boolean
  needsOrganization: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsOrganization, setNeedsOrganization] = useState(false)

  // Load user profile with organizations
  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      /*
       * A signed-in account with no profile row is a real state, not an
       * error: signup can be interrupted between creating the auth user and
       * creating the workspace. maybeSingle() so that case comes back as null
       * instead of throwing.
       *
       * This previously used single() and returned early on the error, which
       * left the context holding whatever it had before — the account stayed
       * "signed in" with no way to recover, because signing out was never
       * reached.
       */
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', supabaseUser.id)
        .maybeSingle()

      if (userError) {
        console.error('Error fetching user data:', userError)
        // Surface the account anyway so the UI can offer sign-out rather
        // than stranding it in a half-loaded state.
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.email || '',
          organizations: [],
          currentOrganizationId: null,
        })
        setCurrentOrganization(null)
        setNeedsOrganization(true)
        return
      }

      // Get user's organizations. organization_members is the single source of
      // truth for membership and roles across the app.
      const { data: orgData, error: orgError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          joined_at,
          organizations!inner(id, name, slug)
        `)
        .eq('user_id', supabaseUser.id)
        .eq('is_active', true)

      if (orgError) {
        console.error('Error fetching organizations:', orgError)
        // Same reasoning as the missing profile above: keep the account
        // visible so it can be signed out of.
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.email || '',
          organizations: [],
          currentOrganizationId: null,
        })
        setCurrentOrganization(null)
        setNeedsOrganization(true)
        return
      }

      const organizations: Organization[] = ((orgData ?? []) as unknown as MembershipRow[]).map(row => ({
        id: row.organization_id,
        name: row.organizations.name,
        slug: row.organizations.slug,
        role: row.role,
        joined_at: row.joined_at
      }))

      const userProfile: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || supabaseUser.email || '',
        first_name: userData?.first_name ?? undefined,
        last_name: userData?.last_name ?? undefined,
        organizations,
        currentOrganizationId: null
      }

      // Set current organization (use first one or from localStorage)
      let currentOrgId = localStorage.getItem('currentOrganizationId')
      if (!currentOrgId || !organizations.find(org => org.id === currentOrgId)) {
        currentOrgId = organizations[0]?.id || null
      }

      if (currentOrgId) {
        const currentOrg = organizations.find(org => org.id === currentOrgId)
        if (currentOrg) {
          userProfile.currentOrganizationId = currentOrgId
          setCurrentOrganization(currentOrg)
          localStorage.setItem('currentOrganizationId', currentOrgId)
        }
      }

      setUser(userProfile)
      setNeedsOrganization(organizations.length === 0)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  // Switch to a different organization
  const switchOrganization = async (organizationId: string) => {
    if (!user) return

    const organization = user.organizations.find(org => org.id === organizationId)
    if (!organization) {
      console.error('Organization not found for user')
      return
    }

    setCurrentOrganization(organization)
    localStorage.setItem('currentOrganizationId', organizationId)
    
    // Update user's current organization
    setUser(prev => prev ? { ...prev, currentOrganizationId: organizationId } : null)
  }

  // Check for existing session on mount
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          try {
            await loadUserProfile(session.user)
          } catch (error) {
            console.log('Initial user profile load failed - this is normal for new users')
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getInitialSession()

    /*
     * Auth events fire while the client holds its auth lock.
     *
     * In @supabase/auth-js, _initialize() runs inside _acquireLock(), and
     * _recoverAndRefresh() notifies subscribers from in there. Every
     * supabase.from(...) call goes through _useSession(), which wants the same
     * lock — and _acquireLock queues re-entrant work behind whatever is
     * already pending. So querying from inside this callback makes the query
     * wait on the callback, and the callback wait on the query.
     *
     * The result is that EVERY supabase call in the app stalls, not just this
     * one, which is why it surfaced as a 30s timeout over in crm-context.
     *
     * Scheduling the work on a later tick lets the lock be released first.
     * The callback itself must stay synchronous.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const signedInUser = session.user
        setTimeout(() => {
          void loadUserProfile(signedInUser).finally(() => setIsLoading(false))
        }, 0)
        return
      }

      if (event === 'SIGNED_OUT') {
        // Also fires when a refresh token is rejected, so this is the single
        // place that tears down state no matter how the session ended.
        // Touches no supabase methods, so it is safe to run inline.
        clearLocalAuthState()
      }

      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        return false
      }

      if (data.user) {
        await loadUserProfile(data.user)
        return true
      }

      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  // Signup function
  const signup = async (
    email: string, 
    password: string, 
    name: string, 
    organizationName: string, 
    organizationEmail?: string
  ): Promise<boolean> => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        console.error('Signup error:', authError)
        return false
      }

      if (!authData.user) {
        return false
      }

      const [firstName, ...lastNameParts] = name.split(' ')
      const lastName = lastNameParts.join(' ')

      /*
       * One call creates the organization, the profile and the admin
       * membership together.
       *
       * These used to be three separate inserts from here, which could not be
       * made atomic and could not read the organization back: the SELECT
       * policy requires a membership row that does not exist until the last
       * step, so `.select().single()` failed after the organization had
       * already been committed, stranding it with no members.
       */
      const { data: orgData, error: orgError } = await supabase
        .rpc('create_organization_with_owner', {
          p_name: organizationName,
          p_email: organizationEmail || email,
          p_first_name: firstName,
          p_last_name: lastName,
        })
        .single()

      if (orgError || !orgData) {
        console.error('Organization creation error:', orgError)
        return false
      }

      // Load the user profile
      await loadUserProfile(authData.user)
      return true
    } catch (error) {
      console.error('Signup error:', error)
      return false
    }
  }

  // Logout function
  /** Clears everything this context owns. Safe to call more than once. */
  const clearLocalAuthState = () => {
    setUser(null)
    setCurrentOrganization(null)
    setNeedsOrganization(false)
    try {
      localStorage.removeItem('currentOrganizationId')
      // supabase-js keys its stored session as sb-<project-ref>-auth-token.
      // If the server round-trip failed it may still be sitting there, and
      // leaving it means the next page load signs straight back in.
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key)
        }
      }
    } catch {
      // Private mode or blocked storage; nothing more we can do here.
    }
  }

  /**
   * Signing out must succeed locally even when the server call does not.
   *
   * The default 'global' scope POSTs to /auth/v1/logout. A network failure or
   * 5xx leaves supabase-js holding the stored session, so the user appears
   * signed in again on the next load. Falling back to a local sign-out and
   * then clearing storage ourselves makes the outcome the same either way.
   */
  const logout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out failed on the server, clearing locally:', error)
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (localError) {
        console.error('Local sign out also failed:', localError)
      }
    }

    // Do not wait for the SIGNED_OUT event: it never fires if signOut bailed
    // early, which is exactly the case this needs to handle.
    clearLocalAuthState()
  }

  const value: AuthContextType = {
    user,
    currentOrganization,
    login,
    signup,
    logout,
    switchOrganization,
    isLoading,
    needsOrganization,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
