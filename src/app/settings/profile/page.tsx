'use client'

import React from 'react'
import Link from 'next/link'
import { User, Mail, ArrowLeft } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { useLocale } from '../../lib/locale'

export default function ProfileSettingsPage() {
  const { user, currentOrganization } = useAuth()
  const { t } = useLocale()

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
        <div className="border-l border-r border-slate-500/50 min-h-screen">
          <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
            <Link
              href="/settings"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('settings.title')}
            </Link>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 pt-2">
                {t('settings.section.profile')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('settings.section.profileDesc')}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {user?.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {currentOrganization?.role || t('common.noOrganization')}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{user?.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
