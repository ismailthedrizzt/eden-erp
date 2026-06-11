import type { EdenPageContract } from '../../core/page.contract'
import { appSureclerIdWizardContract } from './app-surecler-id.wizard.contract'

export const appSureclerIdPageContract = {
  route: '/app/surecler/[id]',
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
  wizard: appSureclerIdWizardContract,
} as const satisfies EdenPageContract
