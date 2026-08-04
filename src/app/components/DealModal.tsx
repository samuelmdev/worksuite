'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, DollarSign, Calendar, User, Building, FileText, Target, Clock } from 'lucide-react'
import type { ClientOption as Client } from '../../lib/client-types'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'


const pipelineStageKeys: Record<string, TranslationKey> = {
  lead: 'enum.pipelineStage.lead',
  qualified: 'enum.pipelineStage.qualified',
  proposal: 'enum.pipelineStage.proposal',
  negotiation: 'enum.pipelineStage.negotiation',
  'closed-won': 'enum.pipelineStage.closedWon',
  'closed-lost': 'enum.pipelineStage.closedLost',
}

const dealSourceKeys: Record<string, TranslationKey> = {
  Website: 'enum.dealSource.website',
  Referral: 'enum.dealSource.referral',
  'Cold Outreach': 'enum.dealSource.coldOutreach',
  'Existing Client': 'enum.dealSource.existingClient',
  'Social Media': 'enum.dealSource.socialMedia',
  'Email Campaign': 'enum.dealSource.emailCampaign',
  'Trade Show': 'enum.dealSource.tradeShow',
  Other: 'enum.dealSource.other',
}

interface DealModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (dealData: DealFormData) => void
  clients: Client[]
  preselectedClient?: Client | null
  deal?: PipelineItem | null
  mode?: 'create' | 'edit'
}

interface PipelineItem {
  id: string
  title: string
  type: 'lead' | 'deal'
  clientId?: string
  clientName: string
  clientEmail: string
  clientCompany: string
  clientPhone?: string
  value: number
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
  probability: number
  expectedCloseDate: string
  assignedTo: string
  notes: string
  source?: string
  isArchived?: boolean
  isBlocked?: boolean
  blockReason?: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

interface DealFormData {
  title: string
  type: 'lead' | 'deal'
  clientId?: string
  clientName: string
  clientEmail: string
  clientCompany: string
  clientPhone?: string
  value: number
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
  probability: number
  expectedCloseDate: string
  assignedTo: string
  notes: string
  source?: string
}

export default function DealModal({
  isOpen, 
  onClose, 
  onSave, 
  clients, 
  preselectedClient,
  deal, 
  mode = 'create' 
}: DealModalProps) {
  const { t } = useLocale()
  const [formData, setFormData] = useState<DealFormData>({
    title: '',
    type: 'deal',
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientCompany: '',
    clientPhone: '',
    value: 0,
    stage: 'lead',
    probability: 10,
    expectedCloseDate: '',
    assignedTo: '',
    notes: '',
    source: 'Website'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      if (deal && mode === 'edit') {
        setFormData({
          title: deal.title,
          type: deal.type,
          clientId: deal.clientId || '',
          clientName: deal.clientName,
          clientEmail: deal.clientEmail,
          clientCompany: deal.clientCompany,
          clientPhone: deal.clientPhone || '',
          value: deal.value,
          stage: deal.stage,
          probability: deal.probability,
          expectedCloseDate: deal.expectedCloseDate,
          assignedTo: deal.assignedTo,
          notes: deal.notes,
          source: deal.source || 'Website'
        })
      } else if (preselectedClient) {
        setFormData(prev => ({
          ...prev,
          clientId: preselectedClient.id,
          clientName: preselectedClient.name,
          clientEmail: preselectedClient.email || '',
          clientCompany: preselectedClient.company || '',
          clientPhone: preselectedClient.phone || '',
          type: 'deal'
        }))
      } else {
        setFormData({
          title: '',
          type: 'lead',
          clientId: '',
          clientName: '',
          clientEmail: '',
          clientCompany: '',
          clientPhone: '',
          value: 0,
          stage: 'lead',
          probability: 10,
          expectedCloseDate: '',
          assignedTo: '',
          notes: '',
          source: 'Website'
        })
      }
      setErrors({})
    }
  }, [isOpen, deal, mode, preselectedClient])

  const handleInputChange = (field: keyof DealFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email || '',
      clientCompany: client.company || '',
      clientPhone: client.phone || '',
      type: 'deal'
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('modal.deal.error.titleRequired')
    }

    if (!formData.clientName.trim()) {
      newErrors.clientName = t('modal.deal.error.clientNameRequired')
    }

    if (!formData.clientEmail.trim()) {
      newErrors.clientEmail = t('modal.deal.error.clientEmailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      newErrors.clientEmail = t('modal.client.error.emailInvalid')
    }

    if (!formData.clientCompany.trim()) {
      newErrors.clientCompany = t('modal.deal.error.clientCompanyRequired')
    }

    if (formData.value <= 0) {
      newErrors.value = t('modal.deal.error.valueRequired')
    }

    if (!formData.expectedCloseDate) {
      newErrors.expectedCloseDate = t('modal.deal.error.closeDateRequired')
    }

    if (formData.probability < 0 || formData.probability > 100) {
      newErrors.probability = t('modal.deal.error.probabilityRange')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving deal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {mode === 'edit' ? t('modal.deal.editTitle') : t('modal.deal.createTitle')}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Deal Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('modal.deal.dealType')}
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="lead"
                      checked={formData.type === 'lead'}
                      onChange={(e) => handleInputChange('type', e.target.value as 'lead' | 'deal')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('modal.deal.leadType')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="deal"
                      checked={formData.type === 'deal'}
                      onChange={(e) => handleInputChange('type', e.target.value as 'lead' | 'deal')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('modal.deal.dealTypeExisting')}</span>
                  </label>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('modal.deal.dealTitle')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 ${
                    errors.title ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder={t('modal.deal.placeholder.title')}
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              {/* Client Selection */}
              {formData.type === 'deal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.deal.selectClient')} *
                  </label>
                  {clients.length > 0 ? (
                    <select
                      value={formData.clientId}
                      onChange={(e) => {
                        const selectedClient = clients.find(c => c.id === e.target.value)
                        if (selectedClient) {
                          handleClientSelect(selectedClient)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                    >
                      <option value="">{t('common.selectClient')}</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} - {client.company}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400">
                      {t('modal.deal.loadingClients')}
                    </div>
                  )}
                </div>
              )}

              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.deal.clientName')} *
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 ${
                      errors.clientName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder={t('modal.deal.placeholder.clientName')}
                  />
                  {errors.clientName && <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.deal.clientEmail')} *
                  </label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 ${
                      errors.clientEmail ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder="client@company.com"
                  />
                  {errors.clientEmail && <p className="mt-1 text-sm text-red-600">{errors.clientEmail}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.company')} *
                  </label>
                  <input
                    type="text"
                    value={formData.clientCompany}
                    onChange={(e) => handleInputChange('clientCompany', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 ${
                      errors.clientCompany ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder={t('modal.deal.placeholder.company')}
                  />
                  {errors.clientCompany && <p className="mt-1 text-sm text-red-600">{errors.clientCompany}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.phone')}
                  </label>
                  <input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Deal Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.deal.dealValue')} *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 ${
                        errors.value ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.deal.probability')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => handleInputChange('probability', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('modal.deal.expectedCloseDate')} *
                  </label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => handleInputChange('expectedCloseDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 ${
                      errors.expectedCloseDate ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                  />
                  {errors.expectedCloseDate && <p className="mt-1 text-sm text-red-600">{errors.expectedCloseDate}</p>}
                </div>
              </div>

              {/* Stage and Source */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.stage')}
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => handleInputChange('stage', e.target.value as DealFormData['stage'])}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  >
                    {Object.entries(pipelineStageKeys).map(([key, labelKey]) => (
                      <option key={key} value={key}>
                        {t(labelKey)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.source')}
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => handleInputChange('source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  >
                    {Object.entries(dealSourceKeys).map(([value, key]) => (
                      <option key={value} value={value}>
                        {t(key)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('common.assignedTo')}
                </label>
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  placeholder={t('modal.deal.placeholder.assignee')}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('common.notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  placeholder={t('modal.deal.placeholder.notes')}
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isSubmitting ? t('common.saving') : mode === 'edit' ? t('modal.deal.updateButton') : t('modal.deal.createButton')}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
