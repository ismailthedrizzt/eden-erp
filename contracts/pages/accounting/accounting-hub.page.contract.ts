import type { EdenPageContract } from '../../core/page.contract'

export const accountingHubPageContract = {
  route: '/app/muhasebe',
  pageKind: 'dashboard',
  owningEntity: 'accounting',
  allowedActions: ['open_accounting_module_area'],
  requiredComponents: ['PageBanner', 'ModuleLinkGrid'],
  requiredStates: {
    empty: true,
    loading: false,
    error: false,
  },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  dashboard: {
    banner: {
      title: 'Muhasebe',
      subtitle: 'Finansal iliskiler, cari kartlar ve cari hareketleri yonetin.',
      icon: 'CreditCard',
    },
    moduleLinks: [
      { href: '/app/muhasebe/cari-kartlar', icon: 'WalletCards', title: 'Cari Kartlar', description: 'Musteri, tedarikci, ortak, paydas ve muhtelif cari iliskilerini tek karttan yonetin.' },
      { href: '/app/muhasebe/cari-hareketler', icon: 'ReceiptText', title: 'Cari Hareketler', description: 'Gider, tahsilat, odeme, belge durumu ve mutabakat hazirligini cari kartlarla birlikte izleyin.' },
      { href: '/app/muhasebe/on-muhasebe-hareketleri', icon: 'FileText', title: 'On Muhasebe Hareketleri', description: 'Eski on muhasebe hareketleri ekranini ve kademeli gecis kayitlarini goruntuleyin.' },
      { href: '/app/muhasebe/banka-hesaplari-ve-kartlari', icon: 'Landmark', title: 'Banka Hesaplari ve Kartlari', description: 'Banka baglantilarini, hesaplari, kartlari ve entegrasyon ayarlarini yonetin.' },
      { href: '/app/muhasebe/banka-hesaplari', icon: 'Landmark', title: 'Banka Hesaplari', description: 'Sirket banka hesaplarini, maskeli IBAN bilgisini ve ekstre import durumunu izleyin.' },
      { href: '/app/muhasebe/banka-hareketleri', icon: 'ArrowLeftRight', title: 'Banka Hareketleri', description: 'CSV/XLSX ekstreden gelen banka hareketlerini cari ve e-belgelerle eslestirmeye hazirlayin.' },
      { href: '/app/muhasebe/e-fatura-e-arsiv', icon: 'ReceiptText', title: 'e-Fatura / e-Arsiv', description: 'e-Belge kayitlarini, belge durumunu, red/in_review akisini ve mutabakat durumunu yonetin.' },
      { href: '/app/muhasebe/mutabakat', icon: 'FileText', title: 'Mutabakat', description: 'Banka, cari ve e-belge eslestirme onerilerini inceleyin; manuel veya kismi eslesme yapin.' },
      { href: '/app/muhasebe/sermaye-mutabakati', icon: 'Scale', title: 'Sermaye Mutabakati', description: 'Sermaye artirimi sonrasi ortak odemelerini banka/cari hareketlerle iliskilendirin.' },
      { href: '/app/muhasebe/hesap-ve-kart-hareketleri', icon: 'CreditCard', title: 'Hesap ve Kart Hareketleri', description: 'Hesap ve kart hareketlerini goruntuleyin, filtreleyin ve on muhasebe kayitlariyla eslestirin.' },
    ],
  },
} as const satisfies EdenPageContract & {
  dashboard: {
    banner: { title: string; subtitle: string; icon: string }
    moduleLinks: readonly { href: string; icon: string; title: string; description: string }[]
  }
}
