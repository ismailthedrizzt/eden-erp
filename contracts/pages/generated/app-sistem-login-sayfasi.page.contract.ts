import type { EdenPageContract } from '../../core/page.contract'

export const appSistemLoginSayfasiPageContract = {
  route: '/app/sistem/login-sayfasi',
  pageKind: 'redirect',
  owningEntity: 'settings',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: false,
    error: true,
  },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,

} as const satisfies EdenPageContract
