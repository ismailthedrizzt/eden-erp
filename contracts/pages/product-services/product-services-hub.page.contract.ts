import type { EdenPageContract } from '../../core/page.contract'

export const productServicesHubPageContract = {
  route: '/app/urun-ve-hizmetler',
  pageKind: 'dashboard',
  owningEntity: 'product_services',
  allowedActions: ['open_product_catalog', 'open_installed_assets', 'open_service_requests'],
  requiredComponents: ['PageBanner', 'ModuleLinkGrid', 'InfoPanel'],
  requiredStates: { empty: true, loading: false, error: false },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  dashboard: {
    banner: {
      title: 'Urun ve Hizmetler',
      subtitle: 'Satilabilir ve servis verilebilir urun/hizmet katalogu.',
      icon: 'Tags',
    },
    moduleLinks: [
      { href: '/app/urun-ve-hizmetler/katalog', icon: 'Tags', title: 'Urun/Hizmet Katalogu', description: 'Seri no, garanti, bakim ve satis sonrasi secilebilirlik burada tanimlanir.' },
      { href: '/app/satis-sonrasi/kurulu-urunler', icon: 'PackageCheck', title: 'Kurulu Urunler', description: 'Musterideki gercek varlik, lokasyon, garanti ve servis gecmisi.' },
      { href: '/app/satis-sonrasi/servis-talepleri', icon: 'Headphones', title: 'Servis Talepleri', description: 'Musteri talebi, atama ve project task entegrasyonu.' },
    ],
    infoPanel: 'Urun katalogu satilabilir/hizmet verilebilir urunun tanimidir. Kurulu urun ise belirli bir musteride, belirli lokasyonda, belirli seri numarasiyla izlenen gercek varliktir.',
  },
} as const satisfies EdenPageContract & {
  dashboard: {
    banner: { title: string; subtitle: string; icon: string }
    moduleLinks: readonly { href: string; icon: string; title: string; description: string }[]
    infoPanel: string
  }
}
