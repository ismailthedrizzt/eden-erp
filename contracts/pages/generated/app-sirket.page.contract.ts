import type { EdenPageContract } from '../../core/page.contract'

export const appSirketPageContract = {
  route: '/app/sirket',
  pageKind: 'dashboard',
  owningEntity: 'companies',
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
