'use client'

import React from 'react'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { user, currentOrganization, isLoading } = useAuth()
  const { t } = useLocale()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return fallback || (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            {t('guard.authRequired')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('guard.signInPrompt')}
          </p>
          <a
            href="/auth/login"
            className="inline-flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            {t('auth.signIn')}
          </a>
        </div>
      </div>
    )
  }

  const has = allowedRoles.includes(currentOrganization?.role || '')

  if (!has) {
    return fallback || (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            {t('guard.accessDenied')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {t('guard.noPermission')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('guard.requiredRoles', { roles: allowedRoles.join(', ') })}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('guard.yourRole', { role: currentOrganization?.role || t('common.noOrganization') })}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
