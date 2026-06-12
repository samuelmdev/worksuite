'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User as SupabaseUser } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'employee'
  organizationId: string
  first_name?: string
  last_name?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string, organizationName: string, organizationEmail?: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  needsOrganization: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsOrganization, setNeedsOrganization] = useState(false)

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
      if (session?.user) {
        // Only load user profile if we have a valid session
        try {
          await loadUserProfile(session.user)
        } catch (error) {
          console.log('User profile not found or not accessible - this is normal for new users')
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])


  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      // Get user profile from our users table
      const { data: userProfile, error } = await supabase
        .from('users')
        .select(`
          *,
          organization:organizations(id, name)
        `)
        .eq('id', supabaseUser.id)
        .single()

      if (error) {
        // Don't log as error - this is normal for users who haven't completed signup
        if (error.code === 'PGRST116' || error.message.includes('No rows found')) {
          console.log('User profile not found - user may not have completed signup yet')
          return
        }
        
        // Only log actual errors (like RLS issues)
        if (error.code === '42P17') {
          console.warn('RLS policy issue - user profile access restricted')
          return
        }
        
        console.error('Unexpected error loading user profile:', error)
        return
      }

      const fullName = userProfile.first_name && userProfile.last_name 
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : userProfile.first_name || userProfile.last_name || 'User'

      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: fullName,
        role: userProfile.role as 'admin' | 'manager' | 'employee',
        organizationId: userProfile.organization_id,
        first_name: userProfile.first_name,
        last_name: userProfile.last_name
      }

      setUser(userData)
      setNeedsOrganization(!userProfile.organization_id)
    } catch (error) {
      console.log('User profile loading failed - this is normal for new users')
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Login error:', error)
        setIsLoading(false)
        return false
      }

      // The user will be loaded automatically via the auth state change listener
      return true
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
      return false
    }
  }


  const signup = async (email: string, password: string, name: string, organizationName: string, organizationEmail?: string): Promise<boolean> => {
    console.log('Starting signup process...', { email, organizationName })
    setIsLoading(true)
    
    try {
      // Split name into first and last name
      const nameParts = name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      console.log('Name parts:', { firstName, lastName })

      // Step 1: Create auth user first
      console.log('Creating auth user...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'admin'
          }
        }
      })

      if (authError) {
        console.error('Auth signup error:', authError)
        setIsLoading(false)
        return false
      }

      console.log('Auth user created successfully:', authData.user?.id)

      if (!authData.user) {
        console.error('No user returned from auth signup')
        setIsLoading(false)
        return false
      }

      // Step 2: Create organization
      console.log('Creating organization...')
      const orgSlug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName,
          slug: orgSlug,
          email: organizationEmail || null
        })
        .select()
        .single()

      if (orgError) {
        console.error('Organization creation error:', orgError)
        setIsLoading(false)
        return false
      }

      console.log('Organization created successfully:', orgData)

      // Step 3: Create user profile
      console.log('Creating user profile...')
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          organization_id: orgData.id,
          first_name: firstName,
          last_name: lastName,
          role: 'admin'
        })

      if (userError) {
        console.error('User profile creation error:', userError)
        setIsLoading(false)
        return false
      }

      console.log('User profile created successfully')
      console.log('Signup completed successfully')
      return true
    } catch (error) {
      console.error('Signup error:', error)
      setIsLoading(false)
      return false
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const value = {
    user,
    login,
    signup,
    logout,
    isLoading,
    needsOrganization
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
