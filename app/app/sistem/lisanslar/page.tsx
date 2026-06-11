'use client'



import { appSistemLisanslarListContract } from '@/contracts/pages/generated/app-sistem-lisanslar.list.contract'

void appSistemLisanslarListContract

import { appSistemLisanslarPageContract } from '@/contracts/pages/generated/app-sistem-lisanslar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemLisanslarContractReady = requirePageContract(appSistemLisanslarPageContract)
void appSistemLisanslarContractReady

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, Building2, CreditCard, PauseCircle, PlayCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import {
  changeTenantLicensePlan,
  getCurrentEntitlements,
  getProductPlans,
  getTenantLicenses,
  type ProductPlan,
  type TenantLicense,
  updateTenantLicenseStatus,
} from '@/lib/services/licensing/licensingService'
import type { TenantEntitlements } from '@/lib/licensing/tenantEntitlements'
import { cn } from '@/lib/utils'

export default function LicensesPage() {
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [plans, setPlans] = useState<ProductPlan[]>([])
  const [licenses, setLicenses] = useState<TenantLicense[]>([])
  const [current, setCurrent] = useState<TenantEntitlements | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [currentResponse, plansResponse, licensesResponse] = await Promise.all([
        getCurrentEntitlements(),
        getProductPlans('eden_erp'),
        getTenantLicenses().catch(() => ({ data: { licenses: [] }, warnings: ['Lisans listesi icin platform yetkisi gerekir.'] })),
      ])
      setCurrent(currentResponse.data)
      setPlans(plansResponse.data.plans || [])
      setLicenses(licensesResponse.data.licenses || [])
      setWarnings([...(currentResponse.warnings || []), ...(plansResponse.warnings || []), ...(licensesResponse.warnings || [])])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lisans bilgileri yuklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const activePlan = useMemo(() => plans.find(plan => plan.plan_key === current?.plan_key), [current?.plan_key, plans])

  async function handlePlanChange(licenseId: string, planKey: string) {
    setWorking(licenseId)
    try {
      await changeTenantLicensePlan(licenseId, planKey)
      await load()
    } finally {
      setWorking(null)
    }
  }

  async function handleStatusAction(licenseId: string, action: 'suspend' | 'reactivate') {
    setWorking(licenseId)
    try {
      await updateTenantLicenseStatus(licenseId, action)
      await load()
    } finally {
      setWorking(null)
    }
  }

  return (
    <div>
      <PageBanner
        mode="list"
        title="Lisanslar"
        subtitle="Tenant bazli urun, plan, lisans, odeme ve modul hak edislerini yonetin."
        icon={<CreditCard size={24} />}
        addButtonText="Yenile"
        customButtonIcon={<RefreshCw size={16} />}
        onAddClick={() => void load()}
      />

      {error && <Notice tone="danger" message={error} />}
      {warnings.map((warning, index) => <Notice key={index} tone="warning" message={warning} />)}

      <section className="mb-5 grid gap-4 lg:grid-cols-4">
        <SummaryCard icon={<ShieldCheck size={18} />} label="Mevcut Plan" value={activePlan?.plan_name || current?.plan_key || 'Bilinmiyor'} detail={current?.source || 'database'} />
        <SummaryCard icon={<BadgeCheck size={18} />} label="Lisans Durumu" value={current?.license_status || '-'} detail={current?.is_development ? 'Development tenant' : 'Customer tenant'} />
        <SummaryCard icon={<Building2 size={18} />} label="Modul Hakki" value={String(current?.enabled_modules?.length || 0)} detail="Release registry sonrasinda uygulanir" />
        <SummaryCard icon={<CreditCard size={18} />} label="Plan Sayisi" value={String(plans.length)} detail="EDEN ERP product catalog" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-eden-navy-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Tenant Lisanslari</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Platform yetkisi varsa tum tenant lisanslari listelenir.</p>
            </div>
          </div>

          {loading ? (
            <div className="h-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ) : licenses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Kalici tenant lisans kaydi bulunamadi. Migration sonrasi mevcut tenantlar medium fallback lisansi alir.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2">Tenant</th>
                    <th className="px-3 py-2">Urun</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Durum</th>
                    <th className="px-3 py-2">Odeme</th>
                    <th className="px-3 py-2">Limit</th>
                    <th className="px-3 py-2">Islemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {licenses.map(license => (
                    <tr key={license.id} className="align-top">
                      <td className="px-3 py-3 font-mono text-xs">{license.tenant_id}</td>
                      <td className="px-3 py-3">{license.product_name || license.product_key}</td>
                      <td className="px-3 py-3">
                        <select
                          value={license.plan_key || ''}
                          disabled={working === license.id}
                          onChange={event => void handlePlanChange(license.id, event.target.value)}
                          className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                        >
                          {plans.map(plan => <option key={plan.plan_key} value={plan.plan_key}>{plan.plan_name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3"><StatusBadge value={license.status} /></td>
                      <td className="px-3 py-3">{license.payment_status || '-'}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {license.max_users ?? '-'} kullanici / {license.max_companies ?? '-'} sirket
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={working === license.id}
                            onClick={() => void handleStatusAction(license.id, license.status === 'suspended' ? 'reactivate' : 'suspend')}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-300 px-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            {license.status === 'suspended' ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                            {license.status === 'suspended' ? 'Aktive Et' : 'Askıya Al'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-eden-navy-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Plan Matrix</h2>
            <div className="mt-3 space-y-3">
              {plans.map(plan => (
                <div key={plan.plan_key} className={cn('rounded-md border p-3', plan.plan_key === current?.plan_key ? 'border-eden-blue bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30' : 'border-gray-200 dark:border-gray-700')}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{plan.plan_name}</div>
                    {plan.is_development_plan && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">internal</span>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
                  <div className="mt-2 text-xs text-gray-500">{plan.business_size_label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-eden-navy-2">
      <div className="mb-2 flex items-center gap-2 text-gray-500 dark:text-gray-400">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div>
      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detail}</div>
    </div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase()
  const tone = normalized === 'active' || normalized === 'trial' || normalized === 'development'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : normalized === 'suspended' || normalized === 'past_due'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', tone)}>{value}</span>
}

function Notice({ tone, message }: { tone: 'warning' | 'danger'; message: string }) {
  return (
    <div className={cn(
      'mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
      tone === 'danger'
        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
        : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
    )}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

