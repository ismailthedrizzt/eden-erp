import type { EdenPageContract } from '../../core/page.contract'

export const appUrunVeHizmetlerBakimPaketleriPageContract = {
  route: '/app/urun-ve-hizmetler/bakim-paketleri',
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
