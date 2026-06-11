import type { EdenPageContract } from '../../core/page.contract'

export const appSozlesmelerYenilemelerPageContract = {
  route: '/app/sozlesmeler/yenilemeler',
  pageKind: 'placeholder',
  owningEntity: 'contracts',
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
