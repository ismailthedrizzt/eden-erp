import type { EdenPageContract } from '../../core/page.contract'

export const portalDashboardPageContract = {
  route: '/portal/dashboard',
  pageKind: 'dashboard',
  owningEntity: 'portal',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: true,
    error: true,
  },
  releaseStatus: 'hidden',
  visibleInProduction: false,
  visibleInStaging: false,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,

} as const satisfies EdenPageContract
