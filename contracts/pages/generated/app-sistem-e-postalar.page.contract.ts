import type { EdenPageContract } from '../../core/page.contract'
import { appSistemEPostalarListContract } from './app-sistem-e-postalar.list.contract'

export const appSistemEPostalarPageContract = {
  route: '/app/sistem/e-postalar',
  pageKind: 'list',
  owningEntity: 'notifications',
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
  list: appSistemEPostalarListContract,
} as const satisfies EdenPageContract
