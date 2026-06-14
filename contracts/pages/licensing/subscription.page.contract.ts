import type { EdenPageContract } from '../../core/page.contract'

export const subscriptionPageContract = {
  route: '/app/aboneligim',
  pageKind: 'dashboard',
  owningEntity: 'tenant_license',
  allowedActions: ['view_current_entitlements'],
  requiredComponents: ['PageBanner', 'InfoCard'],
  requiredStates: {
    empty: true,
    loading: true,
    error: true,
  },
  releaseStatus: 'live',
  visibleInProduction: true,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  dashboard: {
    banner: {
      title: 'Aboneligim',
      subtitle: 'Bu calisma alani icin aktif urun plani, lisans durumu ve kullanim limitleri.',
    },
    summaryCards: [
      { id: 'product', label: 'Urun', valueKey: 'product_key', fallback: 'eden_erp' },
      { id: 'plan', label: 'Plan', valueKey: 'plan_key', fallback: '-' },
      { id: 'status', label: 'Durum', valueKey: 'license_status', fallback: '-' },
    ],
    modulesSectionTitle: 'Acik Moduller',
    limitsSectionTitle: 'Limitler',
  },
} as const satisfies EdenPageContract & {
  dashboard: {
    banner: {
      title: string
      subtitle: string
    }
    summaryCards: readonly {
      id: 'product' | 'plan' | 'status'
      label: string
      valueKey: string
      fallback: string
    }[]
    modulesSectionTitle: string
    limitsSectionTitle: string
  }
}
