import type { EdenPageContract } from '../../core/page.contract'

export const portalDocumentsPageContract = {
  route: '/portal/documents',
  pageKind: 'placeholder',
  owningEntity: 'portal',
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
