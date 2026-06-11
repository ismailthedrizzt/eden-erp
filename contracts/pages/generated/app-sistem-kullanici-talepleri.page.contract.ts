import type { EdenPageContract } from '../../core/page.contract'
import { appSistemKullaniciTalepleriWizardContract } from './app-sistem-kullanici-talepleri.wizard.contract'

export const appSistemKullaniciTalepleriPageContract = {
  route: '/app/sistem/kullanici-talepleri',
  pageKind: 'wizard',
  owningEntity: 'settings',
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
  wizard: appSistemKullaniciTalepleriWizardContract,
} as const satisfies EdenPageContract
