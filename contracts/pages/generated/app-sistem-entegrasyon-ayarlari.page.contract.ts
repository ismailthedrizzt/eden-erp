import type { EdenPageContract } from '../../core/page.contract'
import { appSistemEntegrasyonAyarlariListContract } from './app-sistem-entegrasyon-ayarlari.list.contract'

export const appSistemEntegrasyonAyarlariPageContract = {
  route: '/app/sistem/entegrasyon-ayarlari',
  pageKind: 'list',
  owningEntity: 'integrations',
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
  list: appSistemEntegrasyonAyarlariListContract,
} as const satisfies EdenPageContract
