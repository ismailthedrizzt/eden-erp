import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeDashboardListContract } from './app-muhasebe-dashboard.list.contract'

export const appMuhasebeDashboardPageContract = {
  route: '/app/muhasebe/dashboard',
  pageKind: 'list',
  owningEntity: 'accounting',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: true,
    error: true,
  },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,
  list: appMuhasebeDashboardListContract,
} as const satisfies EdenPageContract
