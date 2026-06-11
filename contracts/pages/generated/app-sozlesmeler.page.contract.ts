import type { EdenPageContract } from '../../core/page.contract'
import { appSozlesmelerWizardContract } from './app-sozlesmeler.wizard.contract'

export const appSozlesmelerPageContract = {
  route: '/app/sozlesmeler',
  pageKind: 'wizard',
  owningEntity: 'contracts',
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
  wizard: appSozlesmelerWizardContract,
} as const satisfies EdenPageContract
