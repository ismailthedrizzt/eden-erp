import type { EdenPageContract } from '../../core/page.contract'

export const appMuhasebeBankaHesaplariPageContract = {
  route: '/app/muhasebe/banka-hesaplari',
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
