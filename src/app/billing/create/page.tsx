'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Clock, FolderOpen, FileText, Loader2 } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { useLocale } from '../../lib/locale'
import { ClientService } from '../../../lib/client-service-multi-org'
import { BillingService, InvoiceFormData, InvoiceLineItem } from '../../../lib/billing-service'

export default function CreateInvoicePage() {
  const { currentOrganization } = useAuth()
  const { t } = useLocale()
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const dueDefault = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [previewItems, setPreviewItems] = useState<InvoiceLineItem[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState<InvoiceFormData>({
    client_id: '',
    issue_date: today,
    due_date: dueDefault,
    tax_rate: 24,
    notes: '',
    include_time_entries: true,
    include_projects: true,
    start_date: monthStart,
    end_date: today,
  })

  useEffect(() => {
    const loadClients = async () => {
      if (!currentOrganization?.id) {
        setLoadingClients(false)
        return
      }
      try {
        const data = await ClientService.getClients(currentOrganization.id)
        setClients(data.map(c => ({ id: c.id, name: c.name })))
        if (data.length > 0) {
          setForm(prev => ({ ...prev, client_id: data[0].id }))
        }
      } catch {
        setClients([])
      } finally {
        setLoadingClients(false)
      }
    }
    loadClients()
  }, [currentOrganization?.id])

  const handlePreview = async () => {
    if (!currentOrganization?.id || !form.client_id) return
    setPreviewLoading(true)
    try {
      const items = await BillingService.buildLineItems(currentOrganization.id, form)
      setPreviewItems(items)
    } catch {
      setPreviewItems([])
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => {
    if (form.client_id && currentOrganization?.id) {
      handlePreview()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.client_id, form.include_time_entries, form.include_projects, form.start_date, form.end_date, currentOrganization?.id])

  const subtotal = previewItems.reduce((sum, item) => sum + item.amount, 0)
  const taxAmount = subtotal * (form.tax_rate / 100)
  const total = subtotal + taxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrganization?.id || !form.client_id) return
    setSubmitting(true)
    try {
      await BillingService.createInvoice(currentOrganization.id, form)
      router.push('/billing/invoices')
    } catch {
      alert(t('billing.create.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RoleGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('billing.create.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('billing.create.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('billing.create.details')}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('billing.invoices.client')}</label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm(prev => ({ ...prev, client_id: e.target.value }))}
                  required
                  disabled={loadingClients}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                >
                  {clients.length === 0 && <option value="">{t('billing.create.noClients')}</option>}
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('billing.create.taxRate')}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.tax_rate}
                  onChange={(e) => setForm(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('billing.create.issueDate')}</label>
                <input
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => setForm(prev => ({ ...prev, issue_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('billing.create.dueDate')}</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('billing.create.notes')}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('billing.create.sources')}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('billing.create.periodStart')}</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('billing.create.periodEnd')}</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-slate-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 flex-1">
                <input
                  type="checkbox"
                  checked={form.include_time_entries}
                  onChange={(e) => setForm(prev => ({ ...prev, include_time_entries: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{t('billing.create.includeTime')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('billing.create.includeTimeDesc')}</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-slate-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 flex-1">
                <input
                  type="checkbox"
                  checked={form.include_projects}
                  onChange={(e) => setForm(prev => ({ ...prev, include_projects: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{t('billing.create.includeProjects')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('billing.create.includeProjectsDesc')}</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {t('billing.create.preview')}
              </h2>
              {previewLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>

            {previewItems.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-6">{t('billing.create.noItems')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-600">
                      <th className="text-left py-2 text-gray-500 dark:text-gray-400">{t('billing.create.lineDescription')}</th>
                      <th className="text-right py-2 text-gray-500 dark:text-gray-400">{t('billing.create.lineQty')}</th>
                      <th className="text-right py-2 text-gray-500 dark:text-gray-400">{t('billing.create.lineRate')}</th>
                      <th className="text-right py-2 text-gray-500 dark:text-gray-400">{t('billing.create.lineAmount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {previewItems.map(item => (
                      <tr key={item.id}>
                        <td className="py-2 text-gray-900 dark:text-slate-100">{item.description}</td>
                        <td className="py-2 text-right text-gray-600 dark:text-gray-300">{item.quantity} {item.unit === 'hours' ? 'h' : ''}</td>
                        <td className="py-2 text-right text-gray-600 dark:text-gray-300">€{item.rate.toFixed(2)}</td>
                        <td className="py-2 text-right font-medium text-gray-900 dark:text-slate-100">€{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600 space-y-1 text-sm text-right">
                  <p className="text-gray-600 dark:text-gray-300">{t('billing.create.subtotal')}: €{subtotal.toFixed(2)}</p>
                  <p className="text-gray-600 dark:text-gray-300">{t('billing.create.tax')} ({form.tax_rate}%): €{taxAmount.toFixed(2)}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{t('billing.create.total')}: €{total.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/billing')}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              {t('common.cancel')}
            </button>
            <motion.button
              type="submit"
              disabled={submitting || previewItems.length === 0 || !form.client_id}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('billing.create.generate')}
            </motion.button>
          </div>
        </form>
      </div>
    </RoleGuard>
  )
}
