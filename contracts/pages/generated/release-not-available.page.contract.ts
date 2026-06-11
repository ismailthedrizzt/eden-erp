import type { EdenPageContract } from '../../core/page.contract'

export const releaseNotAvailablePageContract = {
  route: '/release-not-available',
  pageKind: 'placeholder',
  owningEntity: 'release',
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
