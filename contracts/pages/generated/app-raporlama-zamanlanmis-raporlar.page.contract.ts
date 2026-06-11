import type { EdenPageContract } from '../../core/page.contract'

export const appRaporlamaZamanlanmisRaporlarPageContract = {
  route: '/app/raporlama/zamanlanmis-raporlar',
  pageKind: 'placeholder',
  owningEntity: 'reporting',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: true,
    error: true,
  },
  releaseStatus: 'hidden',
  visibleInProduction: false,
  visibleInStaging: false,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,

} as const satisfies EdenPageContract
