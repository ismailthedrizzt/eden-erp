'use client'


import { useEffect, useState } from 'react'
import { BadgeCheck, CreditCard, Database, ShieldCheck } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { subscriptionPageContract } from '@/contracts/pages/licensing/subscription.page.contract'
import type { TenantEntitlements } from '@/lib/licensing/tenantEntitlements'
import { getCurrentEntitlements } from '@/lib/services/licensing/licensingService'

const SUBSCRIPTION_DASHBOARD = subscriptionPageContract.dashboard
type SubscriptionSummaryCard = typeof SUBSCRIPTION_DASHBOARD.summaryCards[number]

export default function MySubscriptionPage() {
  const [data, setData] = useState<TenantEntitlements | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentEntitlements()
      .then(response => {
        setData(response.data)
        setWarnings(response.warnings || response.data.warnings || [])
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Abonelik bilgisi yuklenemedi.'))
  }, [])

  return (
    <main data-contract-route={subscriptionPageContract.route}>
      <PageBanner
        mode="list"
        title={SUBSCRIPTION_DASHBOARD.banner.title}
        subtitle={SUBSCRIPTION_DASHBOARD.banner.subtitle}
        icon={<CreditCard size={24} />}
      />

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {warnings.map((warning, index) => <div key={index} className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}

      <section className="grid gap-4 md:grid-cols-3">
        {SUBSCRIPTION_DASHBOARD.summaryCards.map(card => (
          <InfoCard
            key={card.id}
            icon={subscriptionCardIcon(card.id)}
            label={card.label}
            value={subscriptionCardValue(data, card)}
          />
        ))}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-eden-navy-2">
          <h2 className="text-base font-semibold">{SUBSCRIPTION_DASHBOARD.modulesSectionTitle}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(data?.enabled_modules || []).map(moduleKey => (
              <span key={moduleKey} className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium dark:border-gray-700">{moduleKey}</span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-eden-navy-2">
          <div className="mb-3 flex items-center gap-2">
            <Database size={18} />
            <h2 className="text-base font-semibold">{SUBSCRIPTION_DASHBOARD.limitsSectionTitle}</h2>
          </div>
          <dl className="space-y-2 text-sm">
            {Object.entries(data?.limits || {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">{key}</dt>
                <dd className="font-semibold">{value ?? 'Sınırsız'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  )
}

function subscriptionCardValue(data: TenantEntitlements | null, card: SubscriptionSummaryCard) {
  const value = data ? (data as unknown as Record<string, unknown>)[card.valueKey] : undefined
  return typeof value === 'string' && value ? value : card.fallback
}

function subscriptionCardIcon(cardId: SubscriptionSummaryCard['id']) {
  if (cardId === 'product') return <ShieldCheck size={18} />
  if (cardId === 'plan') return <BadgeCheck size={18} />
  return <CreditCard size={18} />
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-eden-navy-2">
      <div className="mb-2 flex items-center gap-2 text-gray-500">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}
