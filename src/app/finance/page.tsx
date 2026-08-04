'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownLeft, ArrowUpRight, Wallet, Clock, Plus, Trash2,
} from 'lucide-react'
import RoleGuard from '../components/RoleGuard'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'
import {
  FinanceService,
  type FinanceSummary,
  type FinanceTransaction,
  type FinanceCategory,
  type TransactionDirection,
} from '../../lib/finance-service'
import TransactionModal from '../components/TransactionModal'

function rangeForYear(year: number) {
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

export default function FinancePage() {
  const { currentOrganization, user } = useAuth()
  const { t } = useLocale()

  const [year, setYear] = useState(() => new Date().getFullYear())
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [categories, setCategories] = useState<FinanceCategory[]>([])
  const [directionFilter, setDirectionFilter] = useState<TransactionDirection | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const organizationId = currentOrganization?.id
  const { start, end } = rangeForYear(year)

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [summaryData, transactionData, categoryData] = await Promise.all([
        FinanceService.getSummary(organizationId, start, end),
        FinanceService.getTransactions(organizationId, {
          from: start,
          to: end,
          ...(directionFilter !== 'all' ? { direction: directionFilter } : {}),
        }),
        FinanceService.getCategories(organizationId),
      ])
      setSummary(summaryData)
      setTransactions(transactionData)
      setCategories(categoryData)
    } catch (err) {
      console.error('Error loading finance data:', err)
      setError(t('finance.loadError'))
    } finally {
      setLoading(false)
    }
  }, [organizationId, start, end, directionFilter, t])

  useEffect(() => {
    load()
  }, [load])

  const money = (amount: number, currency = summary?.currency ?? 'EUR') =>
    amount.toLocaleString(undefined, { style: 'currency', currency })

  const handleDelete = async (id: string) => {
    if (!organizationId) return
    if (!window.confirm(t('finance.deleteConfirm'))) return
    try {
      await FinanceService.deleteTransaction(id, organizationId)
      load()
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'SYSTEM_TRANSACTION'
          ? t('finance.systemTransactionError')
          : t('finance.deleteError')
      )
    }
  }

  const statCards = [
    { labelKey: 'finance.incoming' as const, value: summary?.total_in ?? 0, icon: ArrowDownLeft, tone: 'text-emerald-600 dark:text-emerald-400' },
    { labelKey: 'finance.outgoing' as const, value: summary?.total_out ?? 0, icon: ArrowUpRight, tone: 'text-red-600 dark:text-red-400' },
    { labelKey: 'finance.net' as const, value: summary?.net ?? 0, icon: Wallet, tone: (summary?.net ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
    { labelKey: 'finance.receivables' as const, value: summary?.outstanding_receivables ?? 0, icon: Clock, tone: 'text-amber-600 dark:text-amber-400' },
  ]

  const maxMonth = Math.max(
    1,
    ...(summary?.by_month.flatMap(m => [m.incoming, m.outgoing]) ?? [1])
  )

  return (
    <RoleGuard>
      <div className="space-y-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('finance.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('finance.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-slate-100"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              {t('finance.addTransaction')}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
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
                className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t(card.labelKey)}</p>
                    <p className={`text-2xl font-bold mt-1 ${card.tone}`}>
                      {loading ? '—' : money(card.value)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-slate-700 rounded-lg">
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              {t('finance.monthlyFlow')}
            </h2>
            {summary && summary.by_month.length > 0 ? (
              <div className="space-y-3">
                {summary.by_month.map(month => (
                  <div key={month.month}>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>{month.month}</span>
                      <span className={month.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                        {money(month.net)}
                      </span>
                    </div>
                    <div className="flex gap-1 h-3">
                      <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${(month.incoming / maxMonth) * 100}%` }}
                        />
                      </div>
                      <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-red-400"
                          style={{ width: `${(month.outgoing / maxMonth) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
                {t('finance.noData')}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              {t('finance.byCategory')}
            </h2>
            {summary && summary.by_category.length > 0 ? (
              <div className="space-y-3">
                {summary.by_category.slice(0, 8).map(category => (
                  <div key={category.slug} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          category.direction === 'in' ? 'bg-emerald-500' : 'bg-red-400'
                        }`}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{category.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 shrink-0 ml-3">
                      {money(category.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
                {t('finance.noData')}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('finance.transactions')}
            </h2>
            <div className="flex gap-1">
              {(['all', 'in', 'out'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setDirectionFilter(option)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    directionFilter === option
                      ? 'bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {option === 'all' ? t('common.all') : option === 'in' ? t('finance.incoming') : t('finance.outgoing')}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.date')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.description')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('finance.category')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('finance.source')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.amount')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">{t('finance.noTransactions')}</td></tr>
                ) : (
                  transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {new Date(tx.occurred_on).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-slate-100">{tx.description}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{tx.category_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                          {tx.source_type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                        tx.direction === 'in'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {tx.direction === 'in' ? '+' : '−'}{money(tx.amount, tx.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tx.source_type === 'manual' && (
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
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

        {organizationId && (
          <TransactionModal
            isOpen={isModalOpen}
            organizationId={organizationId}
            categories={categories}
            createdBy={user?.id ?? null}
            onClose={() => setIsModalOpen(false)}
            onSaved={load}
          />
        )}
      </div>
    </RoleGuard>
  )
}
