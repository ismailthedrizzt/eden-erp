import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeBankaHesaplariVeKartlariListContract } from './app-muhasebe-banka-hesaplari-ve-kartlari.list.contract'
import { appMuhasebeBankaHesaplariVeKartlariWizardContract } from './app-muhasebe-banka-hesaplari-ve-kartlari.wizard.contract'

export const appMuhasebeBankaHesaplariVeKartlariPageContract = {
  route: '/app/muhasebe/banka-hesaplari-ve-kartlari',
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
  list: appMuhasebeBankaHesaplariVeKartlariListContract,
  wizard: appMuhasebeBankaHesaplariVeKartlariWizardContract,
} as const satisfies EdenPageContract
