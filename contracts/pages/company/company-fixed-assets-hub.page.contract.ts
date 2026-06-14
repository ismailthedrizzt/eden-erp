import type { EdenPageContract } from '../../core/page.contract'

export const companyFixedAssetsHubPageContract = {
  route: '/app/sirket/demirbas',
  pageKind: 'dashboard',
  owningEntity: 'company_fixed_asset',
  allowedActions: ['open_inventory', 'open_categories', 'open_assignments', 'open_qr_tools', 'open_reports', 'open_stocktake'],
  requiredComponents: ['PageBanner', 'ModuleLinkGrid', 'ComingSoonPanel'],
  requiredStates: { empty: true, loading: false, error: false },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  dashboard: {
    banner: {
      title: 'Demirbas ve Zimmetler',
      subtitle: 'Sabit kiymetler ve zimmet yonetimi',
      icon: 'Package',
    },
    moduleLinks: [
      { href: '/app/sirket/demirbas/envanter', icon: 'Package', title: 'Envanter', description: 'Tum demirbas kayitlari' },
      { href: '/app/sirket/demirbas/kategoriler', icon: 'Tag', title: 'Kategoriler', description: 'Demirbas kategori ve tipleri' },
      { href: '/app/sirket/demirbas/zimmet', icon: 'ArrowRight', title: 'Zimmet Yonetimi', description: 'Calisan zimmet atamalari' },
      { href: '/app/sirket/demirbas/barkod', icon: 'QrCode', title: 'Barkod / QR', description: 'Barkod olusturma ve tarayici' },
      { href: '/app/sirket/demirbas/raporlar', icon: 'ArrowRight', title: 'Raporlar', description: 'Envanter ve amortisman raporlari' },
      { href: '/app/sirket/demirbas/sayim', icon: 'ArrowRight', title: 'Sayim', description: 'Periyodik sayim ve kontrol' },
    ],
    emptyState: {
      title: 'Demirbas Yonetimi',
      message: 'Sabit kiymetler ve zimmet yonetimi ekranlari yakinda eklenecek.',
    },
  },
} as const satisfies EdenPageContract & {
  dashboard: {
    banner: { title: string; subtitle: string; icon: string }
    moduleLinks: readonly { href: string; icon: string; title: string; description: string }[]
    emptyState: { title: string; message: string }
  }
}
