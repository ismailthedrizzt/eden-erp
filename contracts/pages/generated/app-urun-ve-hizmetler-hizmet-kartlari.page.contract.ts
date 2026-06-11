import type { EdenPageContract } from '../../core/page.contract'

export const appUrunVeHizmetlerHizmetKartlariPageContract = {
  route: '/app/urun-ve-hizmetler/hizmet-kartlari',
  pageKind: 'placeholder',
  owningEntity: 'product_services',
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
