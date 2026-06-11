import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeOnMuhasebeHareketleriListContract } from './app-muhasebe-on-muhasebe-hareketleri.list.contract'
import { appMuhasebeOnMuhasebeHareketleriFormContract } from './app-muhasebe-on-muhasebe-hareketleri.form.contract'
import { appMuhasebeOnMuhasebeHareketleriWizardContract } from './app-muhasebe-on-muhasebe-hareketleri.wizard.contract'

export const appMuhasebeOnMuhasebeHareketleriPageContract = {
  route: '/app/muhasebe/on-muhasebe-hareketleri',
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
  list: appMuhasebeOnMuhasebeHareketleriListContract,
  form: appMuhasebeOnMuhasebeHareketleriFormContract,
  wizard: appMuhasebeOnMuhasebeHareketleriWizardContract,
} as const satisfies EdenPageContract
