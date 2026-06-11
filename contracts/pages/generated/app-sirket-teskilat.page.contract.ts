import type { EdenPageContract } from '../../core/page.contract'
import { appSirketTeskilatListContract } from './app-sirket-teskilat.list.contract'
import { appSirketTeskilatFormContract } from './app-sirket-teskilat.form.contract'
import { appSirketTeskilatWizardContract } from './app-sirket-teskilat.wizard.contract'

export const appSirketTeskilatPageContract = {
  route: '/app/sirket/teskilat',
  pageKind: 'wizard',
  owningEntity: 'organization',
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
  list: appSirketTeskilatListContract,
  form: appSirketTeskilatFormContract,
  wizard: appSirketTeskilatWizardContract,
} as const satisfies EdenPageContract
