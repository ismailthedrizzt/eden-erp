import type { EdenPageContract } from '../../core/page.contract'
import { appSistemLisanslarListContract } from './app-sistem-lisanslar.list.contract'

export const appSistemLisanslarPageContract = {
  route: '/app/sistem/lisanslar',
  pageKind: 'list',
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
  list: appSistemLisanslarListContract,
} as const satisfies EdenPageContract
