import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeIslemlerListContract } from './app-muhasebe-islemler.list.contract'

export const appMuhasebeIslemlerPageContract = {
  route: '/app/muhasebe/islemler',
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
  list: appMuhasebeIslemlerListContract,
} as const satisfies EdenPageContract
