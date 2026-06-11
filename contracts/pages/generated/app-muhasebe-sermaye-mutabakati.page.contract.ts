import type { EdenPageContract } from '../../core/page.contract'

export const appMuhasebeSermayeMutabakatiPageContract = {
  route: '/app/muhasebe/sermaye-mutabakati',
  pageKind: 'placeholder',
  owningEntity: 'accounting',
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
