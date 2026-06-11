import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeEFaturaEArsivWizardContract } from './app-muhasebe-e-fatura-e-arsiv.wizard.contract'

export const appMuhasebeEFaturaEArsivPageContract = {
  route: '/app/muhasebe/e-fatura-e-arsiv',
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
  wizard: appMuhasebeEFaturaEArsivWizardContract,
} as const satisfies EdenPageContract
