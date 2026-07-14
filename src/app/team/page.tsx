'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Crown, Shield, User, ArrowRight } from 'lucide-react'
import RoleGuard from '../components/RoleGuard'
import { useAuth } from '../lib/auth-context-multi-org'
import { useLocale } from '../lib/locale'
import { TeamService, TeamMember, TeamStats } from '../../lib/team-service-multi-org'

export default function TeamOverviewPage() {
  const { currentOrganization } = useAuth()
  const { t } = useLocale()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats>({ total_members: 0, admins: 0, managers: 0, employees: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!currentOrganization?.id) {
        setLoading(false)
        return
      }
      try {
        const data = await TeamService.getMembers(currentOrganization.id)
        setMembers(data)
        setStats(TeamService.getStats(data))
      } catch {
        setMembers([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentOrganization?.id])

  const statCards = [
    { labelKey: 'team.stats.totalMembers' as const, value: stats.total_members, icon: Users },
    { labelKey: 'team.stats.admins' as const, value: stats.admins, icon: Crown },
    { labelKey: 'team.stats.managers' as const, value: stats.managers, icon: Shield },
    { labelKey: 'team.stats.employees' as const, value: stats.employees, icon: User },
  ]

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('team.overview.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('team.overview.subtitle')}</p>
        </div>

        {currentOrganization && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('team.overview.organization')}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">{currentOrganization.name}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.labelKey}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t(card.labelKey)}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                      {loading ? '—' : card.value}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
                    <Icon className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('team.overview.recentMembers')}</h2>
            <Link href="/team/members" className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
              {t('common.viewAll', { item: t('team.nav.members') })}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <p className="p-5 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          ) : members.length === 0 ? (
            <p className="p-8 text-center text-gray-500 dark:text-gray-400">{t('team.members.empty')}</p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {members.slice(0, 5).map(member => {
                const Icon = roleIcon(member.role)
                return (
                  <div key={member.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">{member.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('team.members.joined')} {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${roleColor(member.role)}`}>
                      {t(`settings.role.${member.role === 'employee' ? 'member' : member.role}`)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
