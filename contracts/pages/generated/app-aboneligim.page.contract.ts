import type { EdenPageContract } from '../../core/page.contract'

export const appAboneligimPageContract = {
  route: '/app/aboneligim',
  pageKind: 'placeholder',
  owningEntity: 'settings',
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
