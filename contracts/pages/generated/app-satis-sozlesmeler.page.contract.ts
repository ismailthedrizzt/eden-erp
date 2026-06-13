import type { EdenPageContract } from '../../core/page.contract'
import { appSatisSozlesmelerWizardContract } from './app-satis-sozlesmeler.wizard.contract'

export const appSatisSozlesmelerPageContract = {
  route: '/app/satis/sozlesmeler',
  pageKind: 'wizard',
  owningEntity: 'contracts',
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
  wizard: appSatisSozlesmelerWizardContract,
} as const satisfies EdenPageContract
