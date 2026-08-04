'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, XCircle, MapPin, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useLocale } from '../lib/locale'

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  notes: string
  status?: string
  isBlocked?: boolean
  blockReason?: string
  blockedAt?: string
  createdAt: string
  updatedAt: string
}

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void
  client?: Client | null
  mode: 'create' | 'edit'
}

export default function ClientModal({ isOpen, onClose, onSave, client, mode }: ClientModalProps) {
  const { t } = useLocale()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [addressValidation, setAddressValidation] = useState<{
    isValidating: boolean
    isValid: boolean | null
    message: string
    bypassed: boolean
  }>({
    isValidating: false,
    isValid: null,
    message: '',
    bypassed: false
  })

  useEffect(() => {
    if (client && mode === 'edit') {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        address: client.address,
        notes: client.notes
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        notes: ''
      })
    }
    setErrors({})
    setAddressValidation({
      isValidating: false,
      isValid: null,
      message: '',
      bypassed: false
    })
  }, [client, mode, isOpen])

  const validateAddress = async (address: string): Promise<boolean> => {
    if (!address.trim()) return true
    
    setAddressValidation(prev => ({ ...prev, isValidating: true, message: '' }))
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`
      )
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable')
      }
      
      const data = await response.json()
      const isValid = data && data.length > 0
      
      setAddressValidation({
        isValidating: false,
        isValid,
        message: isValid 
          ? t('modal.client.addressVerified')
          : t('modal.client.addressNotFound'),
        bypassed: false
      })
      
      return isValid
    } catch (error) {
      console.error('Address validation error:', error)
      setAddressValidation({
        isValidating: false,
        isValid: null,
        message: t('modal.client.addressVerifyFailed'),
        bypassed: false
      })
      return true
    }
  }

  const validateForm = async () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('modal.client.error.nameRequired')
    }

    if (!formData.email.trim()) {
      newErrors.email = t('modal.client.error.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('modal.client.error.emailInvalid')
    }

    if (!formData.company.trim()) {
      newErrors.company = t('modal.client.error.companyRequired')
    }

    if (formData.address.trim() && !addressValidation.bypassed) {
      const isAddressValid = await validateAddress(formData.address)
      if (!isAddressValid && !addressValidation.bypassed) {
        newErrors.address = t('modal.client.error.addressUnverified')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const isValid = await validateForm()
    if (isValid) {
      onSave(formData)
      onClose()
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    if (field === 'address') {
      setAddressValidation({
        isValidating: false,
        isValid: null,
        message: '',
        bypassed: false
      })
    }
  }

  const handleAddressBlur = async () => {
    if (formData.address.trim()) {
      await validateAddress(formData.address)
    }
  }

  const handleBypassValidation = () => {
    setAddressValidation(prev => ({
      ...prev,
      bypassed: true,
      message: t('modal.client.addressBypassed')
    }))
    setErrors(prev => ({ ...prev, address: '' }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={onClose}
          />
          
          <motion.div
            className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {mode === 'create' ? t('modal.client.addTitle') : t('modal.client.editTitle')}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.name')} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                      errors.name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder={t('modal.client.placeholder.name')}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.email')} *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                      errors.email ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder={t('modal.client.placeholder.email')}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.phone')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                    placeholder={t('modal.client.placeholder.phone')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.company')} *
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 ${
                      errors.company ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder={t('modal.client.placeholder.company')}
                  />
                  {errors.company && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.company}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('common.address')}
                  </label>
                  <div className="relative">
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      onBlur={handleAddressBlur}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 ${
                        errors.address ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder={t('modal.client.placeholder.address')}
                    />
                    
                    {formData.address.trim() && (
                      <div className="absolute top-2 right-2">
                        {addressValidation.isValidating ? (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        ) : addressValidation.isValid === true ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : addressValidation.isValid === false ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  
                  {addressValidation.message && (
                    <div className={`mt-2 flex items-center space-x-2 text-sm ${
                      addressValidation.isValid === true 
                        ? 'text-green-600 dark:text-green-400' 
                        : addressValidation.isValid === false 
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      <MapPin className="w-4 h-4" />
                      <span>{addressValidation.message}</span>
                    </div>
                  )}
                  
                  {addressValidation.isValid === false && !addressValidation.bypassed && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={handleBypassValidation}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1.5" />
                        {t('modal.client.saveAnyway')}
                      </button>
                    </div>
                  )}
                  
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('common.notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  placeholder={t('modal.client.placeholder.notes')}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {mode === 'create' ? t('modal.client.createButton') : t('modal.client.saveChanges')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
