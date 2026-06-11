import type { EdenPageContract } from '../../core/page.contract'

export const appMuhasebeBankaHareketleriPageContract = {
  route: '/app/muhasebe/banka-hareketleri',
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
