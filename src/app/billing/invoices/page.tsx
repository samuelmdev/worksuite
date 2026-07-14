'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FileText, Download, Trash2, PlusCircle } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { useLocale } from '../../lib/locale'
import { BillingService, Invoice } from '../../../lib/billing-service'

export default function InvoicesPage() {
  const { currentOrganization } = useAuth()
  const { t } = useLocale()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const loadInvoices = () => {
    if (!currentOrganization?.id) return
    setInvoices(BillingService.getInvoices(currentOrganization.id))
    setLoading(false)
  }

  useEffect(() => {
    loadInvoices()
  }, [currentOrganization?.id])

  const handleExport = (invoice: Invoice) => {
    const csv = BillingService.exportInvoiceCsv(invoice)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.invoice_number}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = (id: string) => {
    if (!currentOrganization?.id) return
    if (!confirm(t('billing.invoices.confirmDelete'))) return
    BillingService.deleteInvoice(id, currentOrganization.id)
    loadInvoices()
  }

  const handleStatusChange = (id: string, status: Invoice['status']) => {
    if (!currentOrganization?.id) return
    BillingService.updateInvoiceStatus(id, currentOrganization.id, status)
    loadInvoices()
  }

  const statusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('billing.invoices.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('billing.invoices.subtitle')}</p>
          </div>
          <Link
            href="/billing/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            {t('billing.nav.createInvoice')}
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        ) : invoices.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('billing.invoices.empty')}</p>
            <Link href="/billing/create" className="text-blue-600 dark:text-blue-400 hover:underline">
              {t('billing.invoices.createFirst')}
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('billing.invoices.number')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('billing.invoices.client')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('billing.invoices.date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('billing.invoices.amount')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('billing.invoices.status')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('billing.invoices.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {invoices.map((invoice, index) => (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.04 }}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{invoice.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{invoice.client_name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{invoice.issue_date}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">€{invoice.total.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={invoice.status}
                          onChange={(e) => handleStatusChange(invoice.id, e.target.value as Invoice['status'])}
                          className={`text-xs rounded-full px-2 py-1 border-0 capitalize cursor-pointer ${statusColor(invoice.status)}`}
                        >
                          <option value="draft">{t('billing.status.draft')}</option>
                          <option value="sent">{t('billing.status.sent')}</option>
                          <option value="paid">{t('billing.status.paid')}</option>
                          <option value="overdue">{t('billing.status.overdue')}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleExport(invoice)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
                            title={t('common.export')}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
