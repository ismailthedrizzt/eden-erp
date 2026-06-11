import type { EdenPageContract } from '../../core/page.contract'

export const testPageContract = {
  route: '/test',
  pageKind: 'placeholder',
  owningEntity: 'demo',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: true,
    error: true,
  },
  releaseStatus: 'demo',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,

} as const satisfies EdenPageContract
