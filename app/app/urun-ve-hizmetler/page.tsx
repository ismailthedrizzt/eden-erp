'use client'

import Link from 'next/link'
import { ArrowRight, Barcode, Handshake, KeyRound, Package, ShieldCheck, Tags, Wrench, type LucideIcon } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { useModuleLicense } from '@/hooks/useModuleLicense'
import { PRODUCT_SERVICES_MODULE_KEY } from '@/lib/modules/product-services/productServices.config'
import { PRODUCT_SERVICES_PERMISSIONS } from '@/lib/modules/product-services/productServices.permissions'
import { getProductCatalogDashboardSummaries } from '@/lib/modules/product-services/productServices.mock'
import { usePermissions } from '@/lib/security/permissionStore'
import type { ProductServicesAreaKey } from '@/lib/modules/product-services/productServices.types'

const AREA_ICON = {
  'urun-kartlari': Package,
  'hizmet-kartlari': Handshake,
  'lisans-abonelik-urunleri': KeyRound,
  'seri-numarali-urunler': Barcode,
  'garanti-sablonlari': ShieldCheck,
  'bakim-paketleri': Wrench,
} satisfies Record<ProductServicesAreaKey, LucideIcon>

export default function ProductServicesHomePage() {
  const permissions = usePermissions()
  const { isModuleActive } = useModuleLicense()
  const canView = permissions.can(PRODUCT_SERVICES_PERMISSIONS.view) || permissions.can(PRODUCT_SERVICES_PERMISSIONS.manage)
  const moduleAvailable = isModuleActive(PRODUCT_SERVICES_MODULE_KEY)
  const summaries = getProductCatalogDashboardSummaries()

  if (!moduleAvailable) {
    return (
      <div>
        <PageBanner
          mode="list"
          title="Ürün ve Hizmetler"
          subtitle="Modül lisansı pasif olduğu için sayfa kullanılamıyor."
          icon={<Tags size={24} />}
        />
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Bu modül sistem ayarlarından aktif edildiğinde merkezi ürün/hizmet kataloğu kullanılabilir.
        </div>
      </div>
    )
  }

  if (!canView) {
    return (
      <div>
        <PageBanner
          mode="list"
          title="Ürün ve Hizmetler"
          subtitle="Bu modülü görüntülemek için yetki gerekiyor."
          icon={<Tags size={24} />}
        />
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Gerekli izin: {PRODUCT_SERVICES_PERMISSIONS.view}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Ürün ve Hizmetler"
        subtitle="Satılabilir, satın alınabilir, üretilebilir, stokta takip edilebilir, lisanslanabilir veya satış sonrası hizmete konu olabilir tüm ürün ve hizmetlerin merkezi tanım alanıdır."
        icon={<Tags size={24} />}
      />

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
                <Metric label="Toplam kayıt" value={summary.totalCount} />
                <Metric label="Aktif kayıt" value={summary.activeCount} />
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-eden-blue px-3 py-2 text-sm font-semibold text-white transition group-hover:bg-eden-blue-dk">
                Aç
                <ArrowRight size={15} />
              </div>
            </Link>
          )
        })}
      </div>

      <section className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
        <div className="font-semibold">Merkezi katalog ilkesi</div>
        <p className="mt-1 leading-6">
          Satış, satınalma, stok, üretim, lisans yönetimi ve satış sonrası hizmetler aynı ürün/hizmet kayıtlarını kullanır. Bir kaydın hangi modüllerde görüneceği kart üzerindeki satılabilir, stokta takip edilir, üretilebilir, lisans takibi var ve servis verilebilir işaretleriyle belirlenir.
        </p>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-gray-700 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-200">
      <div className="text-xs font-medium opacity-75">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  )
}
