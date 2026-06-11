import type { EdenPageContract } from '../../core/page.contract'

export const loginPageContract = {
  route: '/login',
  pageKind: 'placeholder',
  owningEntity: 'auth',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
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

} as const satisfies EdenPageContract
