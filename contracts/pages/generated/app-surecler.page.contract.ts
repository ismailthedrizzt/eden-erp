import type { EdenPageContract } from '../../core/page.contract'
import { appSureclerListContract } from './app-surecler.list.contract'
import { appSureclerWizardContract } from './app-surecler.wizard.contract'

export const appSureclerPageContract = {
  route: '/app/surecler',
  pageKind: 'wizard',
  owningEntity: 'process',
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
  list: appSureclerListContract,
  wizard: appSureclerWizardContract,
} as const satisfies EdenPageContract
