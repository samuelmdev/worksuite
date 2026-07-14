'use client'

import React, { useState } from 'react'
import RoleGuard from '../../components/RoleGuard'
import SettingsSubpage from '../../components/SettingsSubpage'
import { SettingsCard, SettingsToggle } from '../../components/SettingsCard'
import { useLocale } from '../../lib/locale'

export default function NotificationsSettingsPage() {
  const { t } = useLocale()
  const [emailDigest, setEmailDigest] = useState(true)
  const [taskReminders, setTaskReminders] = useState(true)
  const [timeApproval, setTimeApproval] = useState(true)
  const [projectUpdates, setProjectUpdates] = useState(false)
  const [billingAlerts, setBillingAlerts] = useState(true)
  const [marketing, setMarketing] = useState(false)

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
      <SettingsSubpage titleKey="settings.section.notifications" descKey="settings.section.notificationsDesc">
        <SettingsCard
          title={t('settings.notifications.emailTitle')}
          description={t('settings.notifications.emailDesc')}
        >
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            <SettingsToggle
              label={t('settings.notifications.weeklyDigest')}
              description={t('settings.notifications.weeklyDigestDesc')}
              checked={emailDigest}
              onChange={setEmailDigest}
            />
            <SettingsToggle
              label={t('settings.notifications.taskReminders')}
              description={t('settings.notifications.taskRemindersDesc')}
              checked={taskReminders}
              onChange={setTaskReminders}
            />
            <SettingsToggle
              label={t('settings.notifications.timeApproval')}
              description={t('settings.notifications.timeApprovalDesc')}
              checked={timeApproval}
              onChange={setTimeApproval}
            />
            <SettingsToggle
              label={t('settings.notifications.projectUpdates')}
              description={t('settings.notifications.projectUpdatesDesc')}
              checked={projectUpdates}
              onChange={setProjectUpdates}
            />
            <SettingsToggle
              label={t('settings.notifications.billingAlerts')}
              description={t('settings.notifications.billingAlertsDesc')}
              checked={billingAlerts}
              onChange={setBillingAlerts}
            />
            <SettingsToggle
              label={t('settings.notifications.marketing')}
              description={t('settings.notifications.marketingDesc')}
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        </SettingsCard>
      </SettingsSubpage>
    </RoleGuard>
  )
}
