import type { EdenPageContract } from '../../core/page.contract'
import { appSistemImportListContract } from './app-sistem-import.list.contract'
import { appSistemImportWizardContract } from './app-sistem-import.wizard.contract'

export const appSistemImportPageContract = {
  route: '/app/sistem/import',
  pageKind: 'wizard',
  owningEntity: 'importExport',
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
  list: appSistemImportListContract,
  wizard: appSistemImportWizardContract,
} as const satisfies EdenPageContract
