'use client'

import React, { useState, useEffect } from 'react'
import { X, Building, Mail, Phone, User, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Info } from 'lucide-react'
import { ClientService } from '@/lib/client-service'
import { useLocale } from '../lib/locale'

interface BasicClientModalProps {
  isOpen: boolean
  onClose: () => void
  client?: any
  mode: 'create' | 'edit'
  onClientSaved?: () => void
}

interface BasicClientFormData {
  name: string
  email: string
  phone: string
  company: string
}

export default function BasicClientModal({
  isOpen,
  onClose,
  client,
  mode,
  onClientSaved
}: BasicClientModalProps) {
  const { t } = useLocale()
  const [formData, setFormData] = useState<BasicClientFormData>({
    name: '',
    email: '',
    phone: '',
    company: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInfoExpanded, setIsInfoExpanded] = useState(false)

  // Reset form when modal opens/closes or client changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && client) {
        setFormData({
          name: client.name || '',
          email: client.email || '',
          phone: client.phone || '',
          company: client.company || ''
        })
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: ''
        })
      }
      setError(null)
    }
  }, [isOpen, client, mode])

  const handleInputChange = (field: keyof BasicClientFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError(t('modal.basicClient.error.nameRequired'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (mode === 'edit' && client) {
        await ClientService.updateClient(client.id, {
          name: formData.name.trim(),
          email: formData.email.trim() || '',
          phone: formData.phone.trim() || '',
          company: formData.company.trim() || '',
          address: client.address || '', // Keep existing address
          notes: client.notes || '' // Keep existing notes
        })
      } else {
        await ClientService.createClient({
          name: formData.name.trim(),
          email: formData.email.trim() || '',
          phone: formData.phone.trim() || '',
          company: formData.company.trim() || '',
          address: '',
          notes: ''
        }, 'active')
      }

      onClientSaved?.()
      onClose()
    } catch (error: any) {
      console.error('Error saving client:', error)
      setError(error.message || t('modal.basicClient.error.saveFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {mode === 'create' ? t('modal.basicClient.addTitle') : t('modal.basicClient.editTitle')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {t('modal.basicClient.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Client Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              {t('common.name')} *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder={t('modal.basicClient.placeholder.name')}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              {t('common.email')}
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="client@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              {t('common.phone')}
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              {t('common.company')}
            </label>
            <input
              type="text"
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder={t('modal.basicClient.placeholder.company')}
            />
          </div>

          {/* Collapsible Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <button
              type="button"
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {t('modal.basicClient.infoTitle')}
                </span>
              </div>
              {isInfoExpanded ? (
                <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
            
            {isInfoExpanded && (
              <div className="px-4 pb-4 pt-0">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    {t('modal.basicClient.infoDesc')}
                  </p>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      {t('modal.basicClient.upgradeTitle')}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {t('modal.basicClient.upgradeDesc')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {mode === 'edit' ? t('modal.basicClient.updateButton') : t('modal.basicClient.addButton')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
