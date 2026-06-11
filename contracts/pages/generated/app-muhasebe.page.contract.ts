import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeWizardContract } from './app-muhasebe.wizard.contract'

export const appMuhasebePageContract = {
  route: '/app/muhasebe',
  pageKind: 'wizard',
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
  wizard: appMuhasebeWizardContract,
} as const satisfies EdenPageContract
