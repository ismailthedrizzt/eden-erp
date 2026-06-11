import type { EdenPageContract } from '../../core/page.contract'
import { appSistemKurulumWizardContract } from './app-sistem-kurulum.wizard.contract'

export const appSistemKurulumPageContract = {
  route: '/app/sistem/kurulum',
  pageKind: 'wizard',
  owningEntity: 'settings',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
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
  wizard: appSistemKurulumWizardContract,
} as const satisfies EdenPageContract
