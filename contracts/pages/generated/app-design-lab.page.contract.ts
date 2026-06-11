import type { EdenPageContract } from '../../core/page.contract'

export const appDesignLabPageContract = {
  route: '/app/design-lab',
  pageKind: 'redirect',
  owningEntity: 'adminConsole',
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
