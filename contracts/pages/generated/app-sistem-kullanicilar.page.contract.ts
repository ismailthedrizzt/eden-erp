import type { EdenPageContract } from '../../core/page.contract'

export const appSistemKullanicilarPageContract = {
  route: '/app/sistem/kullanicilar',
  pageKind: 'placeholder',
  owningEntity: 'security',
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
