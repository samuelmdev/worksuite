'use client'

import React, { useEffect, useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { useLocale } from '../lib/locale'
import {
  FinanceService,
  type FinanceCategory,
  type TransactionDirection,
} from '../../lib/finance-service'

interface TransactionModalProps {
  isOpen: boolean
  organizationId: string
  categories: FinanceCategory[]
  createdBy: string | null
  onClose: () => void
  onSaved?: () => void
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 shape-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-gray-900 dark:focus:ring-slate-300 focus:border-transparent'

export default function TransactionModal({
  isOpen,
  organizationId,
  categories,
  createdBy,
  onClose,
  onSaved,
}: TransactionModalProps) {
  const { t } = useLocale()

  const [direction, setDirection] = useState<TransactionDirection>('out')
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [reference, setReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setDirection('out')
    setAmount('')
    setOccurredOn(new Date().toISOString().split('T')[0])
    setDescription('')
    setCategoryId('')
    setReference('')
    setError(null)
  }, [isOpen])

  // Categories are direction-specific, so switching direction invalidates the
  // current selection.
  useEffect(() => {
    setCategoryId('')
  }, [direction])

  const availableCategories = categories.filter(c => c.direction === direction)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !amount) {
      setError(t('finance.validation'))
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await FinanceService.createTransaction({
        organization_id: organizationId,
        direction,
        amount: Number(amount),
        occurred_on: occurredOn,
        description: description.trim(),
        reference: reference.trim() || null,
        category_id: categoryId || null,
        source_type: 'manual',
        created_by: createdBy,
      })
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('finance.saveError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 shape-sm shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {t('finance.addTransaction')}
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

          <div className="grid grid-cols-2 gap-2">
            {(['in', 'out'] as TransactionDirection[]).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setDirection(option)}
                className={`px-4 py-3 shape-sm border text-sm font-medium transition-colors ${
                  direction === option
                    ? option === 'in'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                      : 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                {option === 'in' ? t('finance.incoming') : t('finance.outgoing')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
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
                {t('common.date')}
              </label>
              <input
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('common.description')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('finance.category')}
            </label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">{t('finance.uncategorised')}</option>
              {availableCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('finance.reference')}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={inputClass}
              placeholder={t('finance.referencePlaceholder')}
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
