import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeBorclarListContract } from './app-muhasebe-borclar.list.contract'

export const appMuhasebeBorclarPageContract = {
  route: '/app/muhasebe/borclar',
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
  list: appMuhasebeBorclarListContract,
} as const satisfies EdenPageContract
