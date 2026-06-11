import type { EdenPageContract } from '../../core/page.contract'

export const appSirketDemirbasPageContract = {
  route: '/app/sirket/demirbas',
  pageKind: 'placeholder',
  owningEntity: 'assets',
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
