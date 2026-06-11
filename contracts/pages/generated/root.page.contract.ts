import type { EdenPageContract } from '../../core/page.contract'

export const rootPageContract = {
  route: '/',
  pageKind: 'redirect',
  owningEntity: 'shell',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: false,
    error: true,
  },
  releaseStatus: 'hidden',
  visibleInProduction: false,
  visibleInStaging: false,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,

} as const satisfies EdenPageContract
