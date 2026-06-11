import type { EdenPageContract } from '../../core/page.contract'

export const appIkDevamDevamsizlikPageContract = {
  route: '/app/ik/devam-devamsizlik',
  pageKind: 'placeholder',
  owningEntity: 'hr',
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
