import type { EdenPageContract } from '../../core/page.contract'

export const appCrmTakiplerPageContract = {
  route: '/app/crm/takipler',
  pageKind: 'placeholder',
  owningEntity: 'crm',
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
