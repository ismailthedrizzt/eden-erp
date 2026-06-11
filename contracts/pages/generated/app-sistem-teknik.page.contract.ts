import type { EdenPageContract } from '../../core/page.contract'

export const appSistemTeknikPageContract = {
  route: '/app/sistem/teknik',
  pageKind: 'placeholder',
  owningEntity: 'adminConsole',
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
