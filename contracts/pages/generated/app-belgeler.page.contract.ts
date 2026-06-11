import type { EdenPageContract } from '../../core/page.contract'
import { appBelgelerListContract } from './app-belgeler.list.contract'

export const appBelgelerPageContract = {
  route: '/app/belgeler',
  pageKind: 'list',
  owningEntity: 'documents',
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
  list: appBelgelerListContract,
} as const satisfies EdenPageContract
