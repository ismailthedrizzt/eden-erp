import type { EdenPageContract } from '../../core/page.contract'

export const appDashboardPageContract = {
  route: '/app/dashboard',
  pageKind: 'redirect',
  owningEntity: 'reporting',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: false,
    error: true,
  },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,

} as const satisfies EdenPageContract
