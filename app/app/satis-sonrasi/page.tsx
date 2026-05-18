'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarClock, Headphones, KeyRound, Package, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import { AFTER_SALES_MODULE_KEY, afterSalesStatusLabels, formatAfterSalesDate, getAfterSalesHealth, isAfterSalesWarning } from '@/lib/modules/after-sales/afterSales.config'
import { AFTER_SALES_PERMISSIONS } from '@/lib/modules/after-sales/afterSales.permissions'
import { afterSalesMockRecords, getAfterSalesDashboardSummaries } from '@/lib/modules/after-sales/afterSales.mock'
import { customerAssetsMockRecords } from '@/lib/modules/product-services/productServices.mock'
import { usePermissions } from '@/lib/security/permissionStore'
import type { AfterSalesAreaKey, AfterSalesRecord } from '@/lib/modules/after-sales/afterSales.types'

const AREA_ICON = {
  'garanti-takip': ShieldCheck,
  'lisans-takip': KeyRound,
  'servis-destek-kayitlari': Wrench,
  'bakim-sozlesme-takip': CalendarClock,
} satisfies Record<AfterSalesAreaKey, LucideIcon>

export default function AfterSalesHomePage() {
  const permissions = usePermissions()
  const { isModuleActive } = useModuleLicense()
  const canView = permissions.can(AFTER_SALES_PERMISSIONS.view) || permissions.can(AFTER_SALES_PERMISSIONS.manage)
  const moduleAvailable = isModuleActive(AFTER_SALES_MODULE_KEY)
  const summaries = getAfterSalesDashboardSummaries()
  const activeCustomerAssets = customerAssetsMockRecords.filter(asset => asset.is_active && !asset.is_deleted)
  const customerAssetWarnings = activeCustomerAssets.filter(asset =>
    asset.status === 'out_of_warranty'
    || asset.status === 'license_expired'
    || asset.warranty_status?.toLocaleLowerCase('tr-TR').includes('yaklaşıyor')
    || asset.license_status?.toLocaleLowerCase('tr-TR').includes('yaklaşıyor')
  )
  const warningRecords = afterSalesMockRecords
    .filter(record => !record.is_deleted && record.record_status === 'active' && isAfterSalesWarning(record))
    .slice(0, 6)

  if (!moduleAvailable) {
    return (
      <div>
        <PageBanner
          mode="list"
          title="Satış Sonrası Hizmetler"
          subtitle="Modül lisansı pasif olduğu için sayfa kullanılamıyor."
          icon={<Headphones size={24} />}
        />
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Bu modül sistem ayarlarından aktif edildiğinde kullanılabilir.
        </div>
      </div>
    )
  }

  if (!canView) {
    return (
      <div>
        <PageBanner
          mode="list"
          title="Satış Sonrası Hizmetler"
          subtitle="Bu modülü görüntülemek için yetki gerekiyor."
          icon={<Headphones size={24} />}
        />
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Gerekli izin: {AFTER_SALES_PERMISSIONS.view}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Satış Sonrası Hizmetler"
        subtitle="Garanti, lisans, servis, destek, bakım ve sözleşme süreçlerini tek yerden takip edin."
        icon={<Headphones size={24} />}
      />

      {warningRecords.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-700 dark:text-amber-300" size={20} />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Yaklaşan bitişler ve kritik servis talepleri</h2>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {warningRecords.map(record => <WarningRow key={record.id} record={record} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {summaries.map(summary => {
          const Icon = AREA_ICON[summary.area.key]
          return (
            <Link
              key={summary.area.key}
              href={summary.area.href}
              className="group rounded-lg border border-gray-200 bg-white p-5 transition hover:border-eden-blue hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-eden-blue"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-eden-blue dark:bg-blue-950/40 dark:text-blue-300">
                    <Icon size={21} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{summary.area.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{summary.area.description}</p>
                  </div>
                </div>
                <ArrowRight className="mt-1 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-eden-blue" size={20} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="Aktif kayıt" value={summary.activeCount} tone="emerald" />
                <Metric label="Uyarı" value={summary.warningCount} tone={summary.criticalCount > 0 ? 'red' : 'amber'} />
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-eden-blue px-3 py-2 text-sm font-semibold text-white transition group-hover:bg-eden-blue-dk">
                Aç
                <ArrowRight size={15} />
              </div>
            </Link>
          )
        })}

        <Link
          href="/app/satis-sonrasi/musterideki-urunler"
          className="group rounded-lg border border-gray-200 bg-white p-5 transition hover:border-eden-blue hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-eden-blue"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-eden-blue dark:bg-blue-950/40 dark:text-blue-300">
                <Package size={21} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Müşterideki Ürünler</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Genel ürün/hizmet kartları ile müşteriye teslim edilen gerçek ürün, cihaz, lisans ve hizmet örneklerini birbirinden ayırır.
                </p>
              </div>
            </div>
            <ArrowRight className="mt-1 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-eden-blue" size={20} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="Aktif ürün" value={activeCustomerAssets.length} tone="emerald" />
            <Metric label="Uyarı" value={customerAssetWarnings.length} tone={customerAssetWarnings.length > 0 ? 'amber' : 'emerald'} />
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-eden-blue px-3 py-2 text-sm font-semibold text-white transition group-hover:bg-eden-blue-dk">
            Aç
            <ArrowRight size={15} />
          </div>
        </Link>
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' | 'red' }) {
  const toneClass = tone === 'red'
    ? 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300'
    : tone === 'amber'
      ? 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
      : 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <div className="text-xs font-medium opacity-75">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  )
}

function WarningRow({ record }: { record: AfterSalesRecord }) {
  const critical = getAfterSalesHealth(record) === 'critical'
  return (
    <div className="rounded-md border border-amber-200 bg-white px-3 py-2 dark:border-amber-900/60 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{record.title}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {record.customer_display_name} · {afterSalesStatusLabels[record.status] || record.status}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${critical ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
          {critical ? 'Kritik' : 'Uyarı'}
        </span>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Bitiş/SLA: {formatAfterSalesDate(record.end_date || record.renewal_date || record.sla_due_at)}
      </div>
    </div>
  )
}
