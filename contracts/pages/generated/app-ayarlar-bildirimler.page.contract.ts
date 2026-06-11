import type { EdenPageContract } from '../../core/page.contract'
import { appAyarlarBildirimlerListContract } from './app-ayarlar-bildirimler.list.contract'

export const appAyarlarBildirimlerPageContract = {
  route: '/app/ayarlar/bildirimler',
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
  list: appAyarlarBildirimlerListContract,
} as const satisfies EdenPageContract
