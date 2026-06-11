import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeCariHareketlerListContract } from './app-muhasebe-cari-hareketler.list.contract'
import { appMuhasebeCariHareketlerFormContract } from './app-muhasebe-cari-hareketler.form.contract'
import { appMuhasebeCariHareketlerWizardContract } from './app-muhasebe-cari-hareketler.wizard.contract'

export const appMuhasebeCariHareketlerPageContract = {
  route: '/app/muhasebe/cari-hareketler',
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
  list: appMuhasebeCariHareketlerListContract,
  form: appMuhasebeCariHareketlerFormContract,
  wizard: appMuhasebeCariHareketlerWizardContract,
} as const satisfies EdenPageContract
