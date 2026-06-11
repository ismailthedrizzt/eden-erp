import type { EdenPageContract } from '../../core/page.contract'

export const portalServiceRequestsPageContract = {
  route: '/portal/service-requests',
  pageKind: 'placeholder',
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
