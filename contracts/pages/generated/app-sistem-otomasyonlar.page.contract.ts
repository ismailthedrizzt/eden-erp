import type { EdenPageContract } from '../../core/page.contract'

export const appSistemOtomasyonlarPageContract = {
  route: '/app/sistem/otomasyonlar',
  pageKind: 'placeholder',
  owningEntity: 'automation',
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
