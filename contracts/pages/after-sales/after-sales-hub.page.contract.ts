import type { EdenPageContract } from '../../core/page.contract'

export const afterSalesHubPageContract = {
  route: '/app/satis-sonrasi',
  pageKind: 'dashboard',
  owningEntity: 'after_sales',
  allowedActions: ['open_installed_assets', 'open_service_requests', 'open_service_records', 'open_maintenance_plans', 'open_due_maintenance', 'open_field_assignments', 'open_checklists'],
  requiredComponents: ['PageBanner', 'ModuleLinkGrid', 'InfoPanel'],
  requiredStates: { empty: true, loading: false, error: false },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  dashboard: {
    banner: {
      title: 'Satis Sonrasi',
      subtitle: 'Kurulum, garanti, bakim, servis talebi ve servis kaydi omurgasi.',
      icon: 'Headphones',
    },
    moduleLinks: [
      { href: '/app/satis-sonrasi/kurulu-urunler', icon: 'PackageCheck', title: 'Kurulu Urunler', description: 'Musteri envanteri ve garanti takibi.' },
      { href: '/app/satis-sonrasi/servis-talepleri', icon: 'Headphones', title: 'Servis Talepleri', description: 'Ariza, bakim, kurulum ve destek talepleri.' },
      { href: '/app/satis-sonrasi/servis-kayitlari', icon: 'Wrench', title: 'Servis Kayitlari', description: 'Saha ziyareti, mudahale ve rapor.' },
      { href: '/app/satis-sonrasi/bakim-planlari', icon: 'CalendarClock', title: 'Bakim Planlari', description: 'Periyodik bakim kurallari ve due item uretimi.' },
      { href: '/app/satis-sonrasi/bakimi-gelenler', icon: 'AlertTriangle', title: 'Bakimi Gelenler', description: 'Yaklasan veya gecmis bakim kayitlari.' },
      { href: '/app/satis-sonrasi/saha-gorevleri', icon: 'Navigation', title: 'Saha Gorevleri', description: 'Teknisyen atama ve mobil servis akisi.' },
      { href: '/app/satis-sonrasi/checklistler', icon: 'ClipboardCheck', title: 'Checklistler', description: 'Servis turu ve urun kontrol sablonlari.' },
    ],
    infoPanel: 'Project task servis talebinin yerine gecmez; takip isini Action Center icine tasir. Servis talebi ve servis kaydi kendi domain lifecycle ile kalir.',
  },
} as const satisfies EdenPageContract & {
  dashboard: {
    banner: { title: string; subtitle: string; icon: string }
    moduleLinks: readonly { href: string; icon: string; title: string; description: string }[]
    infoPanel: string
  }
}
