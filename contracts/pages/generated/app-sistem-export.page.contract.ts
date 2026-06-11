import type { EdenPageContract } from '../../core/page.contract'
import { appSistemExportListContract } from './app-sistem-export.list.contract'
import { appSistemExportWizardContract } from './app-sistem-export.wizard.contract'

export const appSistemExportPageContract = {
  route: '/app/sistem/export',
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
  list: appSistemExportListContract,
  wizard: appSistemExportWizardContract,
} as const satisfies EdenPageContract
