import type { EdenPageContract } from '../../core/page.contract'

export const appSatisSozlesmelerPageContract = {
  route: '/app/satis/sozlesmeler',
  pageKind: 'redirect',
  owningEntity: 'contracts',
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
