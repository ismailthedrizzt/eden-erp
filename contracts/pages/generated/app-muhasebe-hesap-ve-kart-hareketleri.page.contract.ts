import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeHesapVeKartHareketleriListContract } from './app-muhasebe-hesap-ve-kart-hareketleri.list.contract'
import { appMuhasebeHesapVeKartHareketleriWizardContract } from './app-muhasebe-hesap-ve-kart-hareketleri.wizard.contract'

export const appMuhasebeHesapVeKartHareketleriPageContract = {
  route: '/app/muhasebe/hesap-ve-kart-hareketleri',
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
  list: appMuhasebeHesapVeKartHareketleriListContract,
  wizard: appMuhasebeHesapVeKartHareketleriWizardContract,
} as const satisfies EdenPageContract
