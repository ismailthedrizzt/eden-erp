import type { EdenPageContract } from '../../core/page.contract'

export const appSatisSonrasiServisDestekKayitlariPageContract = {
  route: '/app/satis-sonrasi/servis-destek-kayitlari',
  pageKind: 'placeholder',
  owningEntity: 'after_sales',
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
