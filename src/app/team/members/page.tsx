'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Shield, User } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import { useAuth } from '../../lib/auth-context-multi-org'
import { useLocale } from '../../lib/locale'
import { TeamService, TeamMember } from '../../../lib/team-service-multi-org'

export default function TeamMembersPage() {
  const { currentOrganization, user } = useAuth()
  const { t } = useLocale()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
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
    } catch {
      alert(t('team.members.roleUpdateError'))
    }
  }

  const roleIcon = (role: TeamMember['role']) => {
    switch (role) {
      case 'admin': return Crown
      case 'manager': return Shield
      default: return User
    }
  }

  const roleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default: return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('team.members.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('team.members.subtitle')}</p>
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
                              className={`text-xs rounded-full px-2 py-1 border-0 capitalize cursor-pointer ${roleColor(member.role)}`}
                            >
                              <option value="admin">{t('settings.role.admin')}</option>
                              <option value="manager">{t('settings.role.manager')}</option>
                              <option value="employee">{t('settings.role.member')}</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${roleColor(member.role)}`}>
                              {t(`settings.role.${member.role === 'employee' ? 'member' : member.role}`)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
