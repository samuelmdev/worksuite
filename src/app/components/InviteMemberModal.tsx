'use client'

import React, { useState } from 'react'
import { X, Mail, User, Shield, AlertCircle } from 'lucide-react'
import { useLocale } from '../lib/locale'
import { TeamService, TeamMember } from '../../lib/team-service-multi-org'
import { ROLES } from '../../lib/module-access'
import { roleLabelKey } from '../lib/role-display'

interface InviteMemberModalProps {
  isOpen: boolean
  organizationId: string
  onClose: () => void
  onInvited?: () => void
}

export default function InviteMemberModal({
  isOpen,
  organizationId,
  onClose,
  onInvited,
}: InviteMemberModalProps) {
  const { t } = useLocale()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<TeamMember['role']>('employee')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setEmail('')
    setFirstName('')
    setLastName('')
    setRole('employee')
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError(t('team.members.emailRequired'))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await TeamService.inviteMember(organizationId, email, role, { firstName, lastName })
      reset()
      onInvited?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('team.members.inviteError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 focus:border-transparent'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {t('team.members.inviteTitle')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {t('team.members.inviteDesc')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              {t('team.members.email')} *
            </label>
            <input
              type="email"
              id="invite-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="teammate@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="invite-first" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                {t('team.members.firstName')}
              </label>
              <input
                type="text"
                id="invite-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="invite-last" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('team.members.lastName')}
              </label>
              <input
                type="text"
                id="invite-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Shield className="w-4 h-4 inline mr-1" />
              {t('common.role')}
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as TeamMember['role'])}
              className={inputClass}
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{t(roleLabelKey(r))}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg transition-colors"
            >
              {isSubmitting ? t('common.loading') : t('team.members.sendInvite')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
