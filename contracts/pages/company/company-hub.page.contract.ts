import type { EdenPageContract } from '../../core/page.contract'

export const companyHubPageContract = {
  route: '/app/sirket',
  pageKind: 'dashboard',
  owningEntity: 'companies',
  allowedActions: ['open_company_module_area'],
  requiredComponents: ['PageBanner', 'ModuleCardGrid'],
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
      title: 'Sirket Yonetimi',
      subtitle: 'Sirket yapilandirmasi ve organizasyon yonetimi',
      icon: 'Building2',
    },
    moduleCards: [
      { title: 'Sirketlerimiz', description: 'Yonetilen sirketler listesi ve detaylari', href: '/app/sirket/companies', icon: 'Building2', colorClass: 'bg-blue-500' },
      { title: 'Teskilat ve Kadro', description: 'Birimler, kadrolar ve organizasyon yapisi', href: '/app/sirket/teskilat', icon: 'Building2', colorClass: 'bg-green-500' },
      { title: 'Sureclerimiz', description: 'Onay surecleri ve is akislari', href: '/app/sirket/surecler', icon: 'Building2', colorClass: 'bg-purple-500' },
      { title: 'Tesislerimiz', description: 'Bina, ofis ve lokasyon yonetimi', href: '/app/sirket/tesisler', icon: 'Building2', colorClass: 'bg-orange-500' },
      { title: 'Sirket Araclarimiz', description: 'Arac filosu ve arac takibi', href: '/app/sirket/araclar', icon: 'Building2', colorClass: 'bg-red-500' },
      { title: 'Demirbas ve Zimmetler', description: 'Sabit kiymetler ve zimmet yonetimi', href: '/app/sirket/demirbas', icon: 'Building2', colorClass: 'bg-teal-500' },
    ],
    emptyWidgetMessage: 'Dashboard widgetlari yakinda eklenecek',
  },
} as const satisfies EdenPageContract & {
  dashboard: {
    banner: { title: string; subtitle: string; icon: string }
    moduleCards: readonly { title: string; description: string; href: string; icon: string; colorClass: string }[]
    emptyWidgetMessage: string
  }
}
