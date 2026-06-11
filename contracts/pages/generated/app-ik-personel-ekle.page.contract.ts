import type { EdenPageContract } from '../../core/page.contract'

export const appIkPersonelEklePageContract = {
  route: '/app/ik/personel-ekle',
  pageKind: 'redirect',
  owningEntity: 'hr',
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
