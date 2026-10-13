'use client'

import React, { useState } from 'react'
import { Building, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'

export default function OrganizationSwitcher() {
  const { user, currentOrganization, switchOrganization } = useAuth()
  const { t } = useLocale()
  const [isOpen, setIsOpen] = useState(false)

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return t('settings.role.admin')
      case 'manager': return t('settings.role.manager')
      case 'member': return t('settings.role.member')
      default: return role
    }
  }

  if (!user || user.organizations.length <= 1) {
    return null // Don't show switcher if user has only one organization
  }

  const handleOrganizationSwitch = async (organizationId: string) => {
    await switchOrganization(organizationId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 shape-sm transition-colors"
      >
        <Building className="w-4 h-4" />
        <span className="max-w-32 truncate">
          {currentOrganization?.name || t('org.selectOrganization')}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shape-sm shadow-lg z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('org.organizations')}
              </div>
              {user.organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleOrganizationSwitch(org.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm shape-sm transition-colors ${
                    currentOrganization?.id === org.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Building className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium truncate">{org.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getRoleLabel(org.role)}
                      </div>
                    </div>
                  </div>
                  {currentOrganization?.id === org.id && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  )
}
