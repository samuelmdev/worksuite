'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FileText, DollarSign, Clock, PlusCircle, ArrowRight } from 'lucide-react'
import RoleGuard from '../components/RoleGuard'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'
import { BillingService, BillingStats, Invoice } from '../../lib/billing-service'

export default function BillingOverviewPage() {
  const { currentOrganization } = useAuth()
  const { t } = useLocale()
  const [stats, setStats] = useState<BillingStats>({
    total_invoices: 0,
    draft_invoices: 0,
    paid_invoices: 0,
    total_revenue: 0,
    outstanding_amount: 0,
    unbilled_hours: 0,
  })
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!currentOrganization?.id) {
        setLoading(false)
        return
      }
      const orgId = currentOrganization.id
      try {
        const [baseStats, invoices] = await Promise.all([
          BillingService.getStats(orgId),
          BillingService.getInvoices(orgId),
        ])
        setStats(baseStats)
        setRecentInvoices(invoices.slice(0, 5))
      } catch (error) {
        console.error('Error loading billing overview:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentOrganization?.id])

  const statCards = [
    { labelKey: 'billing.stats.totalInvoices' as const, value: stats.total_invoices, icon: FileText, color: 'blue' },
    { labelKey: 'billing.stats.totalRevenue' as const, value: `€${stats.total_revenue.toFixed(2)}`, icon: DollarSign, color: 'emerald' },
    { labelKey: 'billing.stats.outstanding' as const, value: `€${stats.outstanding_amount.toFixed(2)}`, icon: DollarSign, color: 'orange' },
    { labelKey: 'billing.stats.unbilledHours' as const, value: `${stats.unbilled_hours.toFixed(1)}h`, icon: Clock, color: 'violet' },
  ]

  const statusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
    }
  }

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('billing.overview.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('billing.overview.subtitle')}</p>
          </div>
          <Link
            href="/billing/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            {t('billing.nav.createInvoice')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.labelKey}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t(card.labelKey)}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                      {loading ? '—' : card.value}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('billing.overview.recentInvoices')}</h2>
            <Link href="/billing/invoices" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              {t('common.viewAll', { item: t('billing.nav.invoices') })}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <p className="p-5 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          ) : recentInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('billing.invoices.empty')}</p>
              <Link href="/billing/create" className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline">
                {t('billing.invoices.createFirst')}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {recentInvoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.client_name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-900 dark:text-slate-100">€{invoice.total.toFixed(2)}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${statusColor(invoice.status)}`}>
                      {t(`billing.status.${invoice.status}`)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
