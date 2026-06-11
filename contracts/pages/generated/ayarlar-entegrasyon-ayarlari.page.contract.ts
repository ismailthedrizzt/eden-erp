import type { EdenPageContract } from '../../core/page.contract'

export const ayarlarEntegrasyonAyarlariPageContract = {
  route: '/ayarlar/entegrasyon-ayarlari',
  pageKind: 'redirect',
  owningEntity: 'legacy',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: false,
    error: true,
  },
  releaseStatus: 'hidden',
  visibleInProduction: false,
  visibleInStaging: false,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,

} as const satisfies EdenPageContract
