'use client'

import React, { useEffect, useState } from 'react'
import { X, AlertCircle, Gift } from 'lucide-react'
import { useLocale } from '../lib/locale'
import type { TeamMember } from '../../lib/team-service-multi-org'
import { CompensationService } from '../../lib/compensation-service'

interface BonusModalProps {
  isOpen: boolean
  organizationId: string
  members: TeamMember[]
  awardedBy: string | null
  onClose: () => void
  onSaved?: () => void
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-gray-900 dark:focus:ring-slate-300 focus:border-transparent'

export default function BonusModal({
  isOpen,
  organizationId,
  members,
  awardedBy,
  onClose,
  onSaved,
}: BonusModalProps) {
  const { t } = useLocale()

  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [period, setPeriod] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setUserId(members[0]?.user_id ?? '')
    setAmount('')
    setReason('')
    setPeriod('')
    setError(null)
  }, [isOpen, members])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !reason.trim()) {
      setError(t('team.compensation.bonusValidation'))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await CompensationService.createBonus({
        organization_id: organizationId,
        user_id: userId,
        amount: Number(amount) || 0,
        reason: reason.trim(),
        period: period || null,
        awarded_by: awardedBy,
      })
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('team.compensation.saveError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 shape-sm shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {t('team.compensation.addBonus')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shape-sm p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('team.members.name')}
            </label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass} required>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Gift className="w-4 h-4 inline mr-1" />
              {t('common.amount')}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('team.compensation.reason')}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('team.compensation.period')}
            </label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 shape-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 shape-sm disabled:opacity-60"
            >
              {isSubmitting ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
