import type { EdenPageContract } from '../../core/page.contract'

export const appMuhasebeMutabakatPageContract = {
  route: '/app/muhasebe/mutabakat',
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
