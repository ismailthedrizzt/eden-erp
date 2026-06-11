import type { EdenPageContract } from '../../core/page.contract'
import { appIkPersonelListContract } from './app-ik-personel.list.contract'
import { appIkPersonelFormContract } from './app-ik-personel.form.contract'
import { appIkPersonelWizardContract } from './app-ik-personel.wizard.contract'

export const appIkPersonelPageContract = {
  route: '/app/ik/personel',
  pageKind: 'wizard',
  owningEntity: 'hr',
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
  list: appIkPersonelListContract,
  form: appIkPersonelFormContract,
  wizard: appIkPersonelWizardContract,
} as const satisfies EdenPageContract
