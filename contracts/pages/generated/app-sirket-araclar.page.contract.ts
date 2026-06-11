import type { EdenPageContract } from '../../core/page.contract'
import { appSirketAraclarListContract } from './app-sirket-araclar.list.contract'

export const appSirketAraclarPageContract = {
  route: '/app/sirket/araclar',
  pageKind: 'list',
  owningEntity: 'assets',
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
  list: appSirketAraclarListContract,
} as const satisfies EdenPageContract
