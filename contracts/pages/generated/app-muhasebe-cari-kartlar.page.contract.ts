import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeCariKartlarListContract } from './app-muhasebe-cari-kartlar.list.contract'
import { appMuhasebeCariKartlarFormContract } from './app-muhasebe-cari-kartlar.form.contract'

export const appMuhasebeCariKartlarPageContract = {
  route: '/app/muhasebe/cari-kartlar',
  pageKind: 'form',
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
  list: appMuhasebeCariKartlarListContract,
  form: appMuhasebeCariKartlarFormContract,
} as const satisfies EdenPageContract
