'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building, 
  Mail, 
  Phone,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useTime } from '../../lib/time-context'
import { useAuth } from '../../lib/auth-context-multi-org'
import { useSubscription } from '../../lib/use-subscription'
import { useRouter } from 'next/navigation'
import BasicClientModal from '../../components/BasicClientModal'
import { useLocale } from '../../lib/locale'

export default function TimeClientsPage() {
  const { t } = useLocale()
  const { user, currentOrganization } = useAuth()
  const { clients, loading } = useTime()
  const { isEntitled: shouldShowTimeTrackingClients, isLoading: subscriptionLoading } = useSubscription()
  const router = useRouter()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Redirect once the subscription is known and does not entitle access.
  useEffect(() => {
    if (user && !subscriptionLoading && !shouldShowTimeTrackingClients) {
      router.push('/time-tracking')
    }
  }, [user, subscriptionLoading, shouldShowTimeTrackingClients, router])

  // Show loading while checking permissions
  if (!user || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  // Don't render if user doesn't have access (will redirect)
  if (!shouldShowTimeTrackingClients) {
    return null
  }

  // Filter clients based on search term
  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      client.name.toLowerCase().includes(searchLower) ||
      (client.email && client.email.toLowerCase().includes(searchLower)) ||
      (client.phone && client.phone.toLowerCase().includes(searchLower)) ||
      (client.company && client.company.toLowerCase().includes(searchLower))
    )
  })

  const handleEditClient = (client: any) => {
    setEditingClient(client)
    setIsClientModalOpen(true)
  }

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm(t('time.clientsPage.delete.message'))) {
      try {
        // TODO: Implement client deletion with time entry cleanup
        console.log('Deleting client:', clientId)
        // await ClientService.deleteClient(clientId)
      } catch (error) {
        console.error('Error deleting client:', error)
      }
    }
  }

  const handleClientSaved = () => {
    // Clients will be refreshed automatically by the context
    setEditingClient(null)
  }

  return (
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('time.clientsPage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('time.clientsPage.subtitle')}
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingClient(null)
              setIsClientModalOpen(true)
            }}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shape-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('time.clientsPage.add')}
          </motion.button>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('time.clientsPage.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 shape-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white dark:bg-slate-800 shape-sm shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Your Clients ({filteredClients.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-2">{t('time.clientsPage.loading')}</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
                {t('time.clientsPage.empty.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('time.clientsPage.empty.desc')}
              </p>
              {!searchTerm && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setEditingClient(null)
                    setIsClientModalOpen(true)
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shape-sm transition-colors"
                >
                  {t('time.clientsPage.add')}
                </motion.button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredClients.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 shape-sm flex items-center justify-center">
                        <Building className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                            {client.name}
                          </h3>
                          {client.company && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              at {client.company}
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          {client.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Mail className="w-4 h-4" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Phone className="w-4 h-4" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditClient(client)}
                        className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        title="Edit client"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => setDeleteConfirm(client.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete client"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 shape-sm shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                      {t('time.clientsPage.delete.title')}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('common.deleteConfirm')}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {t('time.clientsPage.delete.message')}
                </p>
                
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 shape-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteClient(deleteConfirm)
                      setDeleteConfirm(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 shape-sm transition-colors"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Basic Client Modal */}
        <BasicClientModal
          isOpen={isClientModalOpen}
          onClose={() => {
            setIsClientModalOpen(false)
            setEditingClient(null)
          }}
          client={editingClient}
          mode={editingClient ? 'edit' : 'create'}
          onClientSaved={handleClientSaved}
        />
      </div>
    </RoleGuard>
  )
}
