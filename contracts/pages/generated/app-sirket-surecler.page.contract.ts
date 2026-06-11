import type { EdenPageContract } from '../../core/page.contract'

export const appSirketSureclerPageContract = {
  route: '/app/sirket/surecler',
  pageKind: 'dashboard',
  owningEntity: 'process',
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

} as const satisfies EdenPageContract
