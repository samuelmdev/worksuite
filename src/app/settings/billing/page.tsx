'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'
import RoleGuard from '../../components/RoleGuard'
import SettingsSubpage from '../../components/SettingsSubpage'
import { SettingsCard } from '../../components/SettingsCard'
import { useLocale } from '../../lib/locale'
import { useAuth } from '../../lib/auth-context-multi-org'
import { useSubscription } from '../../lib/use-subscription'
import { SubscriptionClient, type BillingInterval } from '../../../lib/subscription-client'

const PRICING: Record<BillingInterval, { amount: string; suffix: string; note?: string }> = {
  monthly: { amount: '€149', suffix: '/mo' },
  annual: { amount: '€1609', suffix: '/yr', note: 'Equivalent to €134/mo' },
}

// useSearchParams forces client-side rendering, so the page body sits behind a
// Suspense boundary to keep the route prerenderable.
export default function SubscriptionBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <BillingSettings />
    </Suspense>
  )
}

function BillingSettings() {
  const { t } = useLocale()
  const { currentOrganization } = useAuth()
  const { subscription, seats, isLoading, isEntitled, refresh } = useSubscription()
  const searchParams = useSearchParams()

  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])

  const isAdmin = currentOrganization?.role === 'admin'
  const checkoutResult = searchParams.get('checkout')

  useEffect(() => {
    if (!currentOrganization?.id) return
    SubscriptionClient.getBillingHistory(currentOrganization.id).then(setHistory)
  }, [currentOrganization?.id])

  // Returning from a successful checkout, the webhook may still be in flight.
  useEffect(() => {
    if (checkoutResult !== 'success') return
    const timer = setTimeout(() => refresh(), 1500)
    return () => clearTimeout(timer)
  }, [checkoutResult, refresh])

  const handleSubscribe = async () => {
    if (!currentOrganization?.id) return
    setBusy(true)
    setError(null)
    try {
      const url = await SubscriptionClient.startCheckout(currentOrganization.id, interval)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.subscription.checkoutError'))
      setBusy(false)
    }
  }

  const handleManage = async () => {
    if (!currentOrganization?.id) return
    setBusy(true)
    setError(null)
    try {
      const url = await SubscriptionClient.openBillingPortal(currentOrganization.id)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.subscription.portalError'))
      setBusy(false)
    }
  }

  const statusBadge = () => {
    if (!subscription) return null
    const tone =
      subscription.status === 'active' || subscription.status === 'trialing'
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
        : subscription.status === 'past_due'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'

    return (
      <span className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full ${tone}`}>
        <CheckCircle className="w-3 h-3" />
        {subscription.status}
      </span>
    )
  }

  const seatPercent = seats.included > 0
    ? Math.min(100, Math.round((seats.used / seats.included) * 100))
    : 0

  return (
    <RoleGuard>
      <SettingsSubpage titleKey="settings.section.billing" descKey="settings.section.billingDesc" maxWidth="3xl">
        {checkoutResult === 'success' && (
          <div className="p-4 shape-sm bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300">
            {t('settings.subscription.checkoutSuccess')}
          </div>
        )}
        {checkoutResult === 'cancelled' && (
          <div className="p-4 shape-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300">
            {t('settings.subscription.checkoutCancelled')}
          </div>
        )}
        {error && (
          <div className="p-4 shape-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <SettingsCard title={t('settings.subscription.currentPlan')}>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('common.loading')}
            </div>
          ) : isEntitled && subscription ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 shape bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.subscription.planLabel')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">WorkSuite</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {subscription.billing_interval === 'annual'
                      ? t('settings.subscription.billedAnnually')
                      : t('settings.subscription.billedMonthly')}
                  </p>
                  {statusBadge()}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-3xl font-black text-gray-900 dark:text-slate-100">
                    {PRICING[subscription.billing_interval ?? 'monthly'].amount}
                    <span className="text-base font-normal text-gray-500">
                      {PRICING[subscription.billing_interval ?? 'monthly'].suffix}
                    </span>
                  </p>
                  {subscription.current_period_end && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {subscription.cancel_at_period_end
                        ? t('settings.subscription.endsOn', {
                            date: new Date(subscription.current_period_end).toLocaleDateString(),
                          })
                        : t('settings.subscription.renewsOn', {
                            date: new Date(subscription.current_period_end).toLocaleDateString(),
                          })}
                    </p>
                  )}
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={handleManage}
                  disabled={busy}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 shape-sm text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  {t('settings.subscription.manage')}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.subscription.noSubscription')}
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['monthly', 'annual'] as BillingInterval[]).map(option => (
                  <button
                    key={option}
                    onClick={() => setInterval(option)}
                    className={`text-left p-4 shape border transition-colors ${
                      interval === option
                        ? 'border-gray-900 dark:border-slate-200 bg-gray-50 dark:bg-slate-800'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {option === 'annual'
                        ? t('settings.subscription.annual')
                        : t('settings.subscription.monthly')}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                      {PRICING[option].amount}
                      <span className="text-sm font-normal text-gray-500">{PRICING[option].suffix}</span>
                    </p>
                    {PRICING[option].note && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{PRICING[option].note}</p>
                    )}
                  </button>
                ))}
              </div>

              {isAdmin ? (
                <button
                  onClick={handleSubscribe}
                  disabled={busy}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 shape-sm text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('settings.subscription.subscribe')}
                </button>
              ) : (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.subscription.adminOnly')}
                </p>
              )}
            </>
          )}
        </SettingsCard>

        <SettingsCard title={t('settings.subscription.usageTitle')}>
          <div className="space-y-3">
            {/* Seats are not capped, so this shows a count rather than a
                "used / allowed" fraction that would read as a quota. */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('settings.subscription.seatsUsed')}</span>
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {t('settings.subscription.seatCount', { count: String(seats.used) })}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  seats.billable_extra > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${seatPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {seats.billable_extra > 0
                ? t('settings.subscription.extraSeats', {
                    count: String(seats.billable_extra),
                    cost: `€${seats.billable_extra * 10}`,
                  })
                : t('settings.subscription.seatsNote')}
            </p>
          </div>
        </SettingsCard>

        {history.length > 0 && (
          <SettingsCard title={t('settings.subscription.history')}>
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {history.map(entry => (
                <div key={entry.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-slate-700 shape-sm">
                      <CreditCard className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {entry.currency} {Number(entry.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.paid_at ? new Date(entry.paid_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                  {entry.invoice_url && (
                    <a
                      href={entry.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 dark:text-gray-300 hover:underline inline-flex items-center gap-1"
                    >
                      {t('settings.subscription.viewInvoice')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </SettingsCard>
        )}
      </SettingsSubpage>
    </RoleGuard>
  )
}
