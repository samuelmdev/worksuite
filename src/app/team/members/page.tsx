'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, UserPlus, Trash2 } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { useLocale } from '../../lib/locale'
import { TeamService, TeamMember } from '../../../lib/team-service-multi-org'
import InviteMemberModal from '../../components/InviteMemberModal'
import { ROLES } from '../../../lib/module-access'
import { roleIcon, roleBadgeClass, roleLabelKey } from '../../lib/role-display'

export default function TeamMembersPage() {
  const { currentOrganization, user } = useAuth()
  const { t } = useLocale()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const isAdmin = currentOrganization?.role === 'admin'

  const loadMembers = async () => {
    if (!currentOrganization?.id) return
    try {
      const data = await TeamService.getMembers(currentOrganization.id)
      setMembers(data)
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [currentOrganization?.id])

  const handleRoleChange = async (memberId: string, role: TeamMember['role']) => {
    if (!currentOrganization?.id || !isAdmin) return
    try {
      await TeamService.updateMemberRole(memberId, currentOrganization.id, role)
      loadMembers()
    } catch (error) {
      alert(
        error instanceof Error && error.message === 'LAST_ADMIN'
          ? t('team.members.lastAdminError')
          : t('team.members.roleUpdateError')
      )
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!currentOrganization?.id || !isAdmin) return
    if (!window.confirm(t('team.members.removeConfirm'))) return
    try {
      await TeamService.deactivateMember(memberId, currentOrganization.id)
      loadMembers()
    } catch (error) {
      alert(
        error instanceof Error && error.message === 'LAST_ADMIN'
          ? t('team.members.lastAdminError')
          : t('team.members.removeError')
      )
    }
  }

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('team.members.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('team.members.subtitle')}</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {t('team.members.invite')}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        ) : members.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-12 text-center">
            <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('team.members.empty')}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.members.name')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('common.role')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.members.joined')}</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('team.members.actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {members.map((member, index) => {
                    const Icon = roleIcon(member.role)
                    const isSelf = member.user_id === user?.id

                    return (
                      <motion.tr
                        key={member.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.04 }}
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-slate-100">
                                {member.name}
                                {isSelf && <span className="ml-2 text-xs text-gray-400">({t('team.members.you')})</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isAdmin && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value as TeamMember['role'])}
                              className={`text-xs rounded-full px-2 py-1 border-0 cursor-pointer ${roleBadgeClass(member.role)}`}
                            >
                              {ROLES.map(r => (
                                <option key={r} value={r}>{t(roleLabelKey(r))}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${roleBadgeClass(member.role)}`}>
                              {t(roleLabelKey(member.role))}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            {!isSelf && (
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                title={t('team.members.remove')}
                                className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isAdmin && currentOrganization && (
          <InviteMemberModal
            isOpen={isInviteOpen}
            organizationId={currentOrganization.id}
            onClose={() => setIsInviteOpen(false)}
            onInvited={loadMembers}
          />
        )}
      </div>
    </RoleGuard>
  )
}
