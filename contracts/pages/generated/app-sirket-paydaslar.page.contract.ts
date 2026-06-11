import type { EdenPageContract } from '../../core/page.contract'

export const appSirketPaydaslarPageContract = {
  route: '/app/sirket/paydaslar',
  pageKind: 'placeholder',
  owningEntity: 'crm',
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
