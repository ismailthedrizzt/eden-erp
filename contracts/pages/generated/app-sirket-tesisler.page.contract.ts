import type { EdenPageContract } from '../../core/page.contract'
import { appSirketTesislerListContract } from './app-sirket-tesisler.list.contract'
import { appSirketTesislerFormContract } from './app-sirket-tesisler.form.contract'
import { appSirketTesislerWizardContract } from './app-sirket-tesisler.wizard.contract'

export const appSirketTesislerPageContract = {
  route: '/app/sirket/tesisler',
  pageKind: 'wizard',
  owningEntity: 'facilities',
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
  list: appSirketTesislerListContract,
  form: appSirketTesislerFormContract,
  wizard: appSirketTesislerWizardContract,
} as const satisfies EdenPageContract
