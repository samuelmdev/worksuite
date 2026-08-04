'use client'

import React, { useEffect, useState } from 'react'
import { X, AlertCircle, Wallet } from 'lucide-react'
import { useLocale } from '../lib/locale'
import type { TeamMember } from '../../lib/team-service-multi-org'
import {
  CompensationService,
  type BaseCompensationType,
  type CommissionRule,
  type MemberCompensation,
} from '../../lib/compensation-service'

interface CompensationModalProps {
  isOpen: boolean
  organizationId: string
  member: TeamMember
  existing: MemberCompensation | null
  onClose: () => void
  onSaved?: () => void
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-gray-900 dark:focus:ring-slate-300 focus:border-transparent'

export default function CompensationModal({
  isOpen,
  organizationId,
  member,
  existing,
  onClose,
  onSaved,
}: CompensationModalProps) {
  const { t } = useLocale()

  const [baseType, setBaseType] = useState<BaseCompensationType>('hourly')
  const [hourlyRate, setHourlyRate] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [salaryPeriod, setSalaryPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [commissionEligible, setCommissionEligible] = useState(false)
  const [ruleId, setRuleId] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().split('T')[0])
  const [rules, setRules] = useState<CommissionRule[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setBaseType(existing?.base_type ?? (member.role === 'sales_rep' ? 'none' : 'hourly'))
    setHourlyRate(existing?.hourly_rate != null ? String(existing.hourly_rate) : '')
    setSalaryAmount(existing?.salary_amount != null ? String(existing.salary_amount) : '')
    setSalaryPeriod(existing?.salary_period ?? 'monthly')
    setCommissionEligible(
      existing?.is_commission_eligible ?? (member.role === 'sales_rep' || member.role === 'manager')
    )
    setRuleId(existing?.commission_rule_id ?? '')
    setEffectiveFrom(existing?.effective_from ?? new Date().toISOString().split('T')[0])
    setError(null)

    CompensationService.getRules(organizationId)
      .then(setRules)
      .catch(() => setRules([]))
  }, [isOpen, existing, member.role, organizationId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await CompensationService.setMemberCompensation({
        organization_id: organizationId,
        user_id: member.user_id,
        base_type: baseType,
        hourly_rate: baseType === 'hourly' ? Number(hourlyRate) || 0 : null,
        salary_amount: baseType === 'salary' ? Number(salaryAmount) || 0 : null,
        salary_period: baseType === 'salary' ? salaryPeriod : null,
        currency: existing?.currency ?? 'EUR',
        is_commission_eligible: commissionEligible,
        commission_rule_id: commissionEligible && ruleId ? ruleId : null,
        effective_from: effectiveFrom,
        effective_to: null,
        notes: null,
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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {t('team.compensation.editTitle')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{member.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Wallet className="w-4 h-4 inline mr-1" />
              {t('team.compensation.baseType')}
            </label>
            <select
              value={baseType}
              onChange={(e) => setBaseType(e.target.value as BaseCompensationType)}
              className={inputClass}
            >
              <option value="hourly">{t('team.compensation.baseHourly')}</option>
              <option value="salary">{t('team.compensation.baseSalary')}</option>
              <option value="none">{t('team.compensation.baseNone')}</option>
            </select>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('team.compensation.baseTypeHint')}
            </p>
          </div>

          {baseType === 'hourly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('team.compensation.hourlyRate')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          )}

          {baseType === 'salary' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('team.compensation.salaryAmount')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('team.compensation.salaryPeriod')}
                </label>
                <select
                  value={salaryPeriod}
                  onChange={(e) => setSalaryPeriod(e.target.value as 'monthly' | 'annual')}
                  className={inputClass}
                >
                  <option value="monthly">{t('settings.subscription.monthly')}</option>
                  <option value="annual">{t('settings.subscription.annual')}</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={commissionEligible}
                onChange={(e) => setCommissionEligible(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-slate-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('team.compensation.commissionEligible')}
              </span>
            </label>

            {commissionEligible && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('team.compensation.commissionRule')}
                </label>
                <select value={ruleId} onChange={(e) => setRuleId(e.target.value)} className={inputClass}>
                  <option value="">{t('team.compensation.useDefaultRule')}</option>
                  {rules.filter(r => r.is_active).map(rule => (
                    <option key={rule.id} value={rule.id}>{rule.name}</option>
                  ))}
                </select>
                {rules.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    {t('team.compensation.noRules')}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('team.compensation.effectiveFrom')}
            </label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className={inputClass}
              required
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('team.compensation.effectiveFromHint')}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg disabled:opacity-60"
            >
              {isSubmitting ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
