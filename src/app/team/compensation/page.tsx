'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, TrendingUp, Gift, Clock, Plus, Check, X } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { useLocale } from '../../lib/locale'
import { roleBadgeClass, roleLabelKey } from '../../lib/role-display'
import { TeamService, type TeamMember } from '../../../lib/team-service-multi-org'
import {
  CompensationService,
  type CompensationSummary,
  type Commission,
  type BonusEntry,
  type MemberCompensation,
} from '../../../lib/compensation-service'
import CompensationModal from '../../components/CompensationModal'
import BonusModal from '../../components/BonusModal'

type Tab = 'summary' | 'commissions' | 'bonuses'

function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export default function TeamCompensationPage() {
  const { currentOrganization, user } = useAuth()
  const { t } = useLocale()

  const [tab, setTab] = useState<Tab>('summary')
  const [period, setPeriod] = useState(() => new Date())
  const [summary, setSummary] = useState<CompensationSummary[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [bonuses, setBonuses] = useState<BonusEntry[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [compensationRecords, setCompensationRecords] = useState<MemberCompensation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [isBonusOpen, setIsBonusOpen] = useState(false)

  const organizationId = currentOrganization?.id
  const { start, end } = monthBounds(period)

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [summaryData, commissionData, bonusData, memberData, compensationData] =
        await Promise.all([
          CompensationService.getCompensationSummary(organizationId, start, end),
          CompensationService.getCommissions(organizationId),
          CompensationService.getBonuses(organizationId),
          TeamService.getMembers(organizationId),
          CompensationService.getAllCompensation(organizationId),
        ])
      setSummary(summaryData)
      setCommissions(commissionData)
      setBonuses(bonusData)
      setMembers(memberData)
      setCompensationRecords(compensationData)
    } catch (err) {
      console.error('Error loading compensation:', err)
      setError(t('team.compensation.loadError'))
    } finally {
      setLoading(false)
    }
  }, [organizationId, start, end, t])

  useEffect(() => {
    load()
  }, [load])

  const money = (amount: number, currency = 'EUR') =>
    amount.toLocaleString(undefined, { style: 'currency', currency })

  const handleCommissionStatus = async (id: string, status: Commission['status']) => {
    if (!organizationId) return
    try {
      await CompensationService.updateCommissionStatus(id, organizationId, status, user?.id)
      load()
    } catch {
      setError(t('team.compensation.updateError'))
    }
  }

  const handleBonusStatus = async (id: string, status: BonusEntry['status']) => {
    if (!organizationId) return
    try {
      await CompensationService.updateBonusStatus(id, organizationId, status)
      load()
    } catch {
      setError(t('team.compensation.updateError'))
    }
  }

  const totals = summary.reduce(
    (acc, row) => ({
      base: acc.base + row.earned_base,
      commission: acc.commission + row.earned_commission,
      bonus: acc.bonus + row.earned_bonus,
      total: acc.total + row.total,
    }),
    { base: 0, commission: 0, bonus: 0, total: 0 }
  )

  const statCards = [
    { labelKey: 'team.compensation.basePay' as const, value: totals.base, icon: Wallet },
    { labelKey: 'team.compensation.commission' as const, value: totals.commission, icon: TrendingUp },
    { labelKey: 'team.compensation.bonuses' as const, value: totals.bonus, icon: Gift },
    { labelKey: 'team.compensation.total' as const, value: totals.total, icon: Clock },
  ]

  const tabs: { key: Tab; labelKey: 'team.compensation.tabSummary' | 'team.compensation.tabCommissions' | 'team.compensation.tabBonuses' }[] = [
    { key: 'summary', labelKey: 'team.compensation.tabSummary' },
    { key: 'commissions', labelKey: 'team.compensation.tabCommissions' },
    { key: 'bonuses', labelKey: 'team.compensation.tabBonuses' },
  ]

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {t('team.compensation.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('team.compensation.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={`${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number)
                if (y && m) setPeriod(new Date(y, m - 1, 1))
              }}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-slate-100"
            />
            <button
              onClick={() => setIsBonusOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 shape-sm text-sm font-medium hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              {t('team.compensation.addBonus')}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 shape-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.labelKey}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="bg-white dark:bg-slate-800 shape-sm border border-gray-200 dark:border-slate-700 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t(card.labelKey)}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                      {loading ? '—' : money(card.value)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-slate-700 shape-sm">
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700">
          {tabs.map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === item.key
                  ? 'border-gray-900 dark:border-slate-100 text-gray-900 dark:text-slate-100'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        ) : tab === 'summary' ? (
          <div className="bg-white dark:bg-slate-800 shape-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.members.name')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.role')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.compensation.hours')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.compensation.basePay')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.compensation.commission')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.compensation.bonuses')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.compensation.total')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {summary.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        {t('team.members.empty')}
                      </td>
                    </tr>
                  ) : (
                    summary.map(row => (
                      <tr key={row.user_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{row.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${roleBadgeClass(row.role)}`}>
                            {t(roleLabelKey(row.role))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                          {row.base_type === 'hourly' ? row.tracked_hours.toFixed(2) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{money(row.earned_base, row.currency)}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{money(row.earned_commission, row.currency)}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{money(row.earned_bonus, row.currency)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{money(row.total, row.currency)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              const member = members.find(m => m.user_id === row.user_id)
                              if (member) setEditingMember(member)
                            }}
                            className="text-xs text-gray-600 dark:text-gray-300 hover:underline"
                          >
                            {t('common.edit')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'commissions' ? (
          <div className="bg-white dark:bg-slate-800 shape-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.compensation.rep')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.compensation.deal')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.compensation.dealValue')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.compensation.commission')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.status')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        {t('team.compensation.noCommissions')}
                      </td>
                    </tr>
                  ) : (
                    commissions.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{c.user_name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.deal_title ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{money(c.deal_value, c.currency)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{money(c.amount, c.currency)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {c.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleCommissionStatus(c.id, 'approved')}
                                className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline mr-3"
                              >
                                <Check className="w-3 h-3" />
                                {t('team.compensation.approve')}
                              </button>
                              <button
                                onClick={() => handleCommissionStatus(c.id, 'cancelled')}
                                className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                              >
                                <X className="w-3 h-3" />
                                {t('common.cancel')}
                              </button>
                            </>
                          )}
                          {c.status === 'approved' && (
                            <button
                              onClick={() => handleCommissionStatus(c.id, 'paid')}
                              className="text-xs text-gray-700 dark:text-gray-200 hover:underline"
                            >
                              {t('team.compensation.markPaid')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 shape-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.members.name')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.compensation.reason')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.amount')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.status')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {bonuses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        {t('team.compensation.noBonuses')}
                      </td>
                    </tr>
                  ) : (
                    bonuses.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{b.user_name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.reason}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{money(b.amount, b.currency)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {b.status === 'pending' && (
                            <button
                              onClick={() => handleBonusStatus(b.id, 'approved')}
                              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline mr-3"
                            >
                              {t('team.compensation.approve')}
                            </button>
                          )}
                          {b.status === 'approved' && (
                            <button
                              onClick={() => handleBonusStatus(b.id, 'paid')}
                              className="text-xs text-gray-700 dark:text-gray-200 hover:underline"
                            >
                              {t('team.compensation.markPaid')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {organizationId && editingMember && (
          <CompensationModal
            isOpen
            organizationId={organizationId}
            member={editingMember}
            existing={compensationRecords.find(c => c.user_id === editingMember.user_id) ?? null}
            onClose={() => setEditingMember(null)}
            onSaved={load}
          />
        )}

        {organizationId && (
          <BonusModal
            isOpen={isBonusOpen}
            organizationId={organizationId}
            members={members}
            awardedBy={user?.id ?? null}
            onClose={() => setIsBonusOpen(false)}
            onSaved={load}
          />
        )}
      </div>
    </RoleGuard>
  )
}
