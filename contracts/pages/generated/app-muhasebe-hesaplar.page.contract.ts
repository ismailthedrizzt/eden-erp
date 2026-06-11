import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeHesaplarListContract } from './app-muhasebe-hesaplar.list.contract'

export const appMuhasebeHesaplarPageContract = {
  route: '/app/muhasebe/hesaplar',
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
  list: appMuhasebeHesaplarListContract,
} as const satisfies EdenPageContract
