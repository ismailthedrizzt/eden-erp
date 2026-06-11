import type { EdenPageContract } from '../../core/page.contract'
import { appSistemModuleLicensesListContract } from './app-sistem-module-licenses.list.contract'

export const appSistemModuleLicensesPageContract = {
  route: '/app/sistem/module-licenses',
  pageKind: 'list',
  owningEntity: 'settings',
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
  list: appSistemModuleLicensesListContract,
} as const satisfies EdenPageContract
