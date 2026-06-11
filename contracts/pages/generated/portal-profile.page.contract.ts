import type { EdenPageContract } from '../../core/page.contract'

export const portalProfilePageContract = {
  route: '/portal/profile',
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
