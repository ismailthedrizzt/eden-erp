import type { EdenPageContract } from '../../core/page.contract'
import { appMuhasebeBankaKartHareketleriListContract } from './app-muhasebe-banka-kart-hareketleri.list.contract'

export const appMuhasebeBankaKartHareketleriPageContract = {
  route: '/app/muhasebe/banka-kart-hareketleri',
  pageKind: 'list',
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
  list: appMuhasebeBankaKartHareketleriListContract,
} as const satisfies EdenPageContract
