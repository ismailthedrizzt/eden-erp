import type { EdenPageContract } from '../../core/page.contract'
import { appSistemVeriKalitesiListContract } from './app-sistem-veri-kalitesi.list.contract'
import { appSistemVeriKalitesiWizardContract } from './app-sistem-veri-kalitesi.wizard.contract'

export const appSistemVeriKalitesiPageContract = {
  route: '/app/sistem/veri-kalitesi',
  pageKind: 'wizard',
  owningEntity: 'dataQuality',
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
  list: appSistemVeriKalitesiListContract,
  wizard: appSistemVeriKalitesiWizardContract,
} as const satisfies EdenPageContract
