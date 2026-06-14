import type { EdenPageContract } from '../../core/page.contract'
import { setupWizardContract } from '../../wizards/system/setup-wizard.wizard.contract'

export const setupWizardPageContract = {
  route: '/app/sistem/kurulum',
  pageKind: 'wizard',
  owningEntity: 'settings',
  allowedActions: ['open_setup_wizard', 'complete_setup_package'],
  requiredComponents: ['PageBanner', 'TenantReadinessPanel', 'SetupWizardModal', 'SetupProgressModal'],
  requiredStates: {
    empty: true,
    loading: true,
    error: true,
  },
  releaseStatus: 'live',
  visibleInProduction: true,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  wizard: setupWizardContract,
} as const satisfies EdenPageContract
