'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from './lib/auth-context-multi-org'
import LoggedInHome from './components/LoggedInHome'
import LandingMarketing from './components/LandingMarketing'
import LandingBusiness from './components/LandingBusiness'
import LandingEmployees from './components/LandingEmployees'

function PublicHome() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view')

  if (view === 'business') return <LandingBusiness />
  if (view === 'employees') return <LandingEmployees />
  return <LandingMarketing />
}

export default function HomePage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return <LoggedInHome />
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PublicHome />
    </Suspense>
  )
}
