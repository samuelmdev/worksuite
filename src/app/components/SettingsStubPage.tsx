'use client'

import React from 'react'
import RoleGuard from '../../components/RoleGuard'
import SettingsSubpage from '../../components/SettingsSubpage'
import { SettingsCard } from '../../components/SettingsCard'
import { useLocale } from '../../lib/locale'
import type { TranslationKey } from '../../lib/translations'

export default function SettingsStubPage({
  titleKey,
  descKey,
  adminOnly = false,
}: {
  titleKey: TranslationKey
  descKey: TranslationKey
  adminOnly?: boolean
}) {
  const { t } = useLocale()

  return (
    <RoleGuard allowedRoles={adminOnly ? ['admin'] : ['admin', 'manager', 'employee']}>
      <SettingsSubpage titleKey={titleKey} descKey={descKey}>
        <SettingsCard>
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('common.comingSoonDesc')}</p>
        </SettingsCard>
      </SettingsSubpage>
    </RoleGuard>
  )
}
