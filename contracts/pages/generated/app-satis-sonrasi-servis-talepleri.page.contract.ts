import type { EdenPageContract } from '../../core/page.contract'

export const appSatisSonrasiServisTalepleriPageContract = {
  route: '/app/satis-sonrasi/servis-talepleri',
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
