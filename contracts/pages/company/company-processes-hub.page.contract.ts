import type { EdenPageContract } from '../../core/page.contract'

export const companyProcessesHubPageContract = {
  route: '/app/sirket/surecler',
  pageKind: 'dashboard',
  owningEntity: 'company_process',
  allowedActions: ['open_process_definitions', 'open_active_processes', 'open_process_reports', 'open_process_monitoring'],
  requiredComponents: ['PageBanner', 'ModuleLinkGrid', 'ComingSoonPanel'],
  requiredStates: { empty: true, loading: false, error: false },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  dashboard: {
    banner: {
      title: 'Sureclerimiz',
      subtitle: 'Onay surecleri ve is akislari yonetimi',
      icon: 'Workflow',
    },
    moduleLinks: [
      { href: '/app/sirket/surecler/tanimlar', icon: 'ArrowRight', title: 'Surec Tanimlari', description: 'Onay sureci sablonlari ve tanimlari' },
      { href: '/app/sirket/surecler/active', icon: 'ArrowRight', title: 'Aktif Surecler', description: 'Devam eden onay surecleri' },
      { href: '/app/sirket/surecler/raporlar', icon: 'ArrowRight', title: 'Surec Raporlari', description: 'Performans ve analiz raporlari' },
      { href: '/app/sirket/surecler/izleme', icon: 'ArrowRight', title: 'Surec Izleme', description: 'Anlik surec takibi ve dashboard' },
    ],
    emptyState: {
      title: 'Surec Yonetimi',
      message: 'Onay surecleri ve is akislari icin yonetim ekranlari yakinda eklenecek.',
      architectureReference: 'docs/architecture/WorkflowEngine.md',
    },
  },
} as const satisfies EdenPageContract & {
  dashboard: {
    banner: { title: string; subtitle: string; icon: string }
    moduleLinks: readonly { href: string; icon: string; title: string; description: string }[]
    emptyState: { title: string; message: string; architectureReference: string }
  }
}
