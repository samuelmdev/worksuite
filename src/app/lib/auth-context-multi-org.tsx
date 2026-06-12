'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User as SupabaseUser } from '@supabase/supabase-js'

export interface Organization {
  id: string
  name: string
  slug: string
  role: 'admin' | 'manager' | 'employee'
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
      // Get user basic info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', supabaseUser.id)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        return
      }

      // Get user's organizations
      const { data: orgData, error: orgError } = await supabase
        .from('user_organizations')
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
        return
      }

      const organizations: Organization[] = orgData.map(org => ({
        id: org.organization_id,
        name: org.organizations.name,
        slug: org.organizations.slug,
        role: org.role,
        joined_at: org.joined_at
      }))

      const userProfile: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || supabaseUser.email || '',
        first_name: userData.first_name,
        last_name: userData.last_name,
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setCurrentOrganization(null)
        setNeedsOrganization(false)
        localStorage.removeItem('currentOrganizationId')
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

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: organizationName,
          slug: organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          email: organizationEmail || email,
        }])
        .select()
        .single()

      if (orgError) {
        console.error('Organization creation error:', orgError)
        return false
      }

      // Create user profile
      const [firstName, ...lastNameParts] = name.split(' ')
      const lastName = lastNameParts.join(' ')

      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
        }])

      if (userError) {
        console.error('User profile creation error:', userError)
        return false
      }

      // Add user to organization as admin
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .insert([{
          user_id: authData.user.id,
          organization_id: orgData.id,
          role: 'admin',
          is_active: true,
        }])

      if (userOrgError) {
        console.error('User-organization link error:', userOrgError)
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
  const logout = async () => {
    await supabase.auth.signOut()
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
