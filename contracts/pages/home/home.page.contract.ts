import type { EdenPageContract } from '../../core/page.contract'

export const homePageContract = {
  route: '/app',
  pageKind: 'dashboard',
  owningEntity: 'home',
  allowedActions: ['configure_dashboard_widgets'],
  requiredComponents: ['PageBanner', 'ActionCenterSummaryCards', 'DashboardGrid', 'WidgetModal'],
  requiredStates: {
    empty: true,
    loading: false,
    error: false,
  },
  releaseStatus: 'live',
  visibleInProduction: true,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  dashboard: {
    widgetStorageScope: 'home',
    widgetPreferenceKey: 'home-dashboard-widgets',
    legacyStorageKey: 'user_widgets',
    addWidgetActionLabel: 'Ekle',
    widgetSources: ['home', 'companies', 'employees'],
    emptyState: {
      title: 'Henuz widget eklenmemis',
      message: 'Ekle butonuyla mevcut widget kayitlarini ana sayfaya ekleyebilirsiniz.',
    },
  },
} as const satisfies EdenPageContract & {
  dashboard: {
    widgetStorageScope: string
    widgetPreferenceKey: string
    legacyStorageKey: string
    addWidgetActionLabel: string
    widgetSources: readonly string[]
    emptyState: {
      title: string
      message: string
    }
  }
}
