import type { EdenPageContract } from '../../core/page.contract'

export const appSatisSonrasiMobilServisAssignmentIdPageContract = {
  route: '/app/satis-sonrasi/mobil-servis/[assignment_id]',
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
