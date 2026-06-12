'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, User, AlertCircle, DollarSign, FileText, Building } from 'lucide-react'
import { ContractsService, ContractFormData } from '../../lib/contracts-service'
import { ClientService } from '../../lib/client-service'
import { Database } from '../../lib/supabase'
import { useLocale } from '../lib/locale'
import type { TranslationKey } from '../lib/translations'

type Client = Database['public']['Tables']['clients']['Row']

const contractTypeKeys: Record<string, TranslationKey> = {
  monthly: 'enum.contractType.monthly',
  yearly: 'enum.contractType.yearly',
  one_time: 'enum.contractType.oneTime',
  hourly: 'enum.contractType.hourly',
  project: 'enum.contractType.project',
}

const billingFrequencyKeys: Record<string, TranslationKey> = {
  monthly: 'enum.billingFrequency.monthly',
  yearly: 'enum.billingFrequency.yearly',
  quarterly: 'enum.billingFrequency.quarterly',
  one_time: 'enum.billingFrequency.oneTime',
}

interface ContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (contract: any) => void
  clients: Client[]
  preselectedClient?: Client
  contract?: any
  mode: 'create' | 'edit'
  pipelineItem?: any // For creating contract from pipeline item
}

export default function ContractModal({ 
  isOpen, 
  onClose, 
  onSave, 
  clients, 
  preselectedClient,
  contract,
  mode,
  pipelineItem
}: ContractModalProps) {
  const { t } = useLocale()
  const [formData, setFormData] = useState<ContractFormData>({
    name: '',
    description: '',
    type: 'monthly',
    status: 'active',
    value: 0,
    monthly_value: 0,
    currency: 'USD',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    auto_renewal: false,
    billing_frequency: 'monthly',
    next_billing_date: '',
    client_id: '',
    assigned_to: '',
    notes: '',
    terms: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && contract) {
        setFormData({
          name: contract.name || '',
          description: contract.description || '',
          type: contract.type || 'monthly',
          status: contract.status || 'active',
          value: contract.value || 0,
          monthly_value: contract.monthly_value || 0,
          currency: contract.currency || 'USD',
          start_date: contract.start_date ? contract.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
          end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
          auto_renewal: contract.auto_renewal || false,
          billing_frequency: contract.billing_frequency || 'monthly',
          next_billing_date: contract.next_billing_date ? contract.next_billing_date.split('T')[0] : '',
          client_id: contract.client_id || '',
          assigned_to: contract.assigned_to || '',
          notes: contract.notes || '',
          terms: contract.terms || ''
        })
      } else if (preselectedClient) {
        setFormData(prev => ({
          ...prev,
          client_id: preselectedClient.id,
          name: pipelineItem ? `${pipelineItem.title} Contract` : '',
          value: pipelineItem ? pipelineItem.value : 0,
          monthly_value: pipelineItem ? pipelineItem.value : 0,
          description: pipelineItem ? `Contract for ${pipelineItem.title} - ${pipelineItem.clientCompany}` : '',
          notes: pipelineItem ? `Created from pipeline item: ${pipelineItem.title}` : ''
        }))
      } else {
        setFormData({
          name: '',
          description: '',
          type: 'monthly',
          status: 'active',
          value: 0,
          monthly_value: 0,
          currency: 'USD',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          auto_renewal: false,
          billing_frequency: 'monthly',
          next_billing_date: '',
          client_id: '',
          assigned_to: '',
          notes: '',
          terms: ''
        })
      }
      setErrors({})
    }
  }, [isOpen, mode, contract, preselectedClient, pipelineItem])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = t('modal.contract.error.nameRequired')
    }
    if (!formData.client_id || formData.client_id === '') {
      newErrors.client_id = t('modal.contract.error.clientRequired')
    }
    if (formData.value <= 0) {
      newErrors.value = t('modal.contract.error.valueRequired')
    }
    if (formData.type === 'monthly' && (formData.monthly_value || 0) <= 0) {
      newErrors.monthly_value = t('modal.contract.error.monthlyValueRequired')
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    try {
      // Clean form data - convert empty strings to undefined for UUID and date fields
      const cleanFormData = {
        ...formData,
        client_id: formData.client_id || undefined,
        assigned_to: formData.assigned_to || undefined,
        end_date: formData.end_date || undefined,
        next_billing_date: formData.next_billing_date || undefined
      }
      
      let savedContract
      if (mode === 'edit' && contract) {
        savedContract = await ContractsService.updateContract(contract.id, cleanFormData)
      } else {
        savedContract = await ContractsService.createContract(cleanFormData)
      }
      onSave(savedContract)
      onClose()
    } catch (error) {
      console.error('Error saving contract:', error)
      setErrors({ submit: t('modal.contract.error.saveFailed') })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof ContractFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  const selectedClient = clients.find(c => c.id === formData.client_id)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {mode === 'edit' ? t('modal.contract.editTitle') : t('modal.contract.createTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('common.client')} *
            </label>
            <select
              value={formData.client_id}
              onChange={(e) => handleInputChange('client_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                errors.client_id ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              }`}
            >
              <option value="">{t('common.selectClient')}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.company && `(${client.company})`}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.client_id}</p>
            )}
            {selectedClient && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  <strong>{t('common.selected')}</strong> {selectedClient.name}
                  {selectedClient.company && ` - ${selectedClient.company}`}
                </p>
                {selectedClient.email && (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {selectedClient.email}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Contract Name and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('modal.contract.name')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                  errors.name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder={t('modal.contract.placeholder.name')}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('modal.contract.type')}
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              >
                {Object.entries(contractTypeKeys).map(([value, key]) => (
                  <option key={value} value={value}>{t(key)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('common.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder={t('modal.contract.placeholder.description')}
            />
          </div>

          {/* Contract Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('modal.contract.totalValue')} *
              </label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                  errors.value ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.value && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.value}</p>
              )}
            </div>

            {formData.type === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('modal.contract.monthlyValue')} *
                </label>
                <input
                  type="number"
                  value={formData.monthly_value}
                  onChange={(e) => handleInputChange('monthly_value', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                    errors.monthly_value ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                {errors.monthly_value && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.monthly_value}</p>
                )}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('common.startDate')} *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('common.endDate')}
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Billing and Renewal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('modal.contract.billingFrequency')}
              </label>
              <select
                value={formData.billing_frequency}
                onChange={(e) => handleInputChange('billing_frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              >
                {Object.entries(billingFrequencyKeys).map(([value, key]) => (
                  <option key={value} value={value}>{t(key)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('modal.contract.nextBillingDate')}
              </label>
              <input
                type="date"
                value={formData.next_billing_date}
                onChange={(e) => handleInputChange('next_billing_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Auto Renewal */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto_renewal"
              checked={formData.auto_renewal}
              onChange={(e) => handleInputChange('auto_renewal', e.target.checked)}
              className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
            />
            <label htmlFor="auto_renewal" className="ml-2 block text-sm text-gray-700 dark:text-slate-300">
              {t('modal.contract.autoRenewal')}
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('common.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:text-slate-100"
              placeholder={t('modal.contract.placeholder.notes')}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <DollarSign className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  {mode === 'edit' ? t('modal.contract.updateButton') : t('modal.contract.createButton')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}