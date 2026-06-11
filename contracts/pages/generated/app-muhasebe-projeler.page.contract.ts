import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeProjelerListContract } from './app-muhasebe-projeler.list.contract'

export const appMuhasebeProjelerPageContract = {
  route: '/app/muhasebe/projeler',
  pageKind: 'list',
  owningEntity: 'accounting',
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
  list: appMuhasebeProjelerListContract,
} as const satisfies EdenPageContract
