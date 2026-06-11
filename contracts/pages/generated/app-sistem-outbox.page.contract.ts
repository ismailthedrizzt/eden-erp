import type { EdenPageContract } from '../../core/page.contract'

export const appSistemOutboxPageContract = {
  route: '/app/sistem/outbox',
  pageKind: 'placeholder',
  owningEntity: 'adminConsole',
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
