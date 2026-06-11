import type { EdenPageContract } from '../../core/page.contract'

export const appSistemEntegrasyonlarPageContract = {
  route: '/app/sistem/entegrasyonlar',
  pageKind: 'placeholder',
  owningEntity: 'integrations',
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
