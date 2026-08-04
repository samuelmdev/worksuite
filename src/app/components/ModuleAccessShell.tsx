'use client'

import React from 'react'
import { useModuleAccess } from '../lib/use-module-access'

interface ModuleAccessShellProps {
  /** Rendered when the user has no access to the module — no sidebar chrome. */
  withoutSidebar: React.ReactNode
  withSidebar: React.ReactNode
}

/** Renders sidebar layout only when the user has access to the current module route. */
export default function ModuleAccessShell({ withoutSidebar, withSidebar }: ModuleAccessShellProps) {
  const { hasAccess, isLoading } = useModuleAccess()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-900">
        <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-900">
        <main className="p-4 sm:p-6">{withoutSidebar}</main>
      </div>
    )
  }

  return <>{withSidebar}</>
}
