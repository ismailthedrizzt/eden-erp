import type { EdenPageContract } from '../../core/page.contract'
import { appIkCalisanlarListContract } from './app-ik-calisanlar.list.contract'
import { appIkCalisanlarFormContract } from './app-ik-calisanlar.form.contract'
import { appIkCalisanlarWizardContract } from './app-ik-calisanlar.wizard.contract'

export const appIkCalisanlarPageContract = {
  route: '/app/ik/calisanlar',
  pageKind: 'shell',
  owningEntity: 'hr',
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
  list: appIkCalisanlarListContract,
  form: appIkCalisanlarFormContract,
  wizard: appIkCalisanlarWizardContract,
} as const satisfies EdenPageContract
