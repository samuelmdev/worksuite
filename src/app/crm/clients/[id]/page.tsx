'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Phone, Building, MapPin, Calendar, DollarSign, FileText, Clock, User, Edit, Trash2 } from 'lucide-react'
import RoleGuard from '../../../components/RoleGuard'
import ClientModal from '../../../components/ClientModal'
import ClientActivityTimeline from '../../../components/ClientActivityTimeline'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Database } from '../../../../lib/supabase'
import { ClientService } from '../../../../lib/client-service'
import { activityService } from '../../../../lib/activity-service'
import { useLocale } from '../../../lib/locale'

type Client = Database['public']['Tables']['clients']['Row']

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useLocale()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [activityStats, setActivityStats] = useState({
    total_interactions: 0,
    calls_made: 0,
    emails_sent: 0,
    meetings_scheduled: 0,
    last_interaction: null as string | null
  })

  const loadClient = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const clientData = await ClientService.getClient(clientId)
      if (clientData) {
        setClient(clientData)
        
        // Load activity stats
        const stats = await activityService.getClientInteractionStats(clientId)
        setActivityStats(stats)
      } else {
        setError(t('crm.clientDetail.notFound'))
      }
    } catch (err) {
      console.error('Error loading client:', err)
      setError(t('common.error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clientId) {
      loadClient()
    }
  }, [clientId])

  const handleUpdateClient = async (updatedClient: Client) => {
    try {
      await ClientService.updateClient(clientId, updatedClient)
      setClient(updatedClient)
      setIsEditModalOpen(false)
    } catch (err) {
      console.error('Error updating client:', err)
    }
  }

  const handleDeleteClient = async () => {
    if (!client) return
    
    try {
      await ClientService.deleteClient(clientId)
      router.push('/crm/clients')
    } catch (err) {
      console.error('Error deleting client:', err)
    }
  }

  const handleActivityLogged = () => {
    // Refresh activity stats
    if (clientId) {
      activityService.getClientInteractionStats(clientId).then(setActivityStats)
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">{t('crm.clientDetail.loading')}</p>
        </div>
      </RoleGuard>
    )
  }

  if (error || !client) {
    return (
      <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {error || t('crm.clientDetail.notFound')}
              </h1>
              <button
                onClick={() => router.push('/crm/clients')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('crm.clientDetail.back')}
              </button>
            </div>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/crm/clients')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('crm.clientDetail.back')}
            </button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
                <p className="text-gray-600 mt-1">
                  {client.company && `${client.company} • `}
                  {client.email}
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push(`/crm/logs?client=${clientId}`)}
                  className="inline-flex items-center px-4 py-2 border border-cyan-300 rounded-md shadow-sm text-sm font-medium text-cyan-700 bg-white hover:bg-cyan-50"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {t('common.viewAll', { item: t('crm.logsPage.title') })}
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t('crm.clients.editClient')}
                </button>
                <button
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('crm.clients.deleteClient')}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Client Information */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crm.clientDetail.contactInfo')}</h2>
                
                <div className="space-y-4">
                  {client.email && (
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('common.email')}</p>
                        <p className="text-sm text-gray-600">{client.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {client.phone && (
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('common.phone')}</p>
                        <p className="text-sm text-gray-600">{client.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {client.company && (
                    <div className="flex items-center">
                      <Building className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('common.company')}</p>
                        <p className="text-sm text-gray-600">{client.company}</p>
                      </div>
                    </div>
                  )}
                  
                  {client.address && (
                    <div className="flex items-center">
                      <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('common.address')}</p>
                        <p className="text-sm text-gray-600">{client.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Stats */}
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('crm.clientDetail.activity')}</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{activityStats.total_interactions}</p>
                    <p className="text-sm text-gray-600">{t('crm.clientDetail.activity')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{activityStats.calls_made}</p>
                    <p className="text-sm text-gray-600">{t('modal.activity.type.call')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{activityStats.emails_sent}</p>
                    <p className="text-sm text-gray-600">{t('modal.activity.type.email')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{activityStats.meetings_scheduled}</p>
                    <p className="text-sm text-gray-600">{t('modal.activity.type.meeting')}</p>
                  </div>
                </div>
                
                {activityStats.last_interaction && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Last interaction: {activityService.formatTimeAgo(activityStats.last_interaction)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="lg:col-span-2">
              <ClientActivityTimeline
                clientId={clientId}
                client={client}
                showAddButton={true}
                onActivityLogged={handleActivityLogged}
              />
            </div>
          </div>
        </div>

        {/* Edit Client Modal */}
        <ClientModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleUpdateClient}
          client={client}
          mode="edit"
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteClient}
          title={t('crm.clients.delete.title')}
          message={t('crm.clients.delete.message', { name: client.name })}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          type="danger"
        />
      </div>
    </RoleGuard>
  )
}
