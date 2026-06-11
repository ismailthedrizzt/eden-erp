import type { EdenPageContract } from '../../core/page.contract'

export const appGorevVeProjeYonetimiIsAkislariPageContract = {
  route: '/app/gorev-ve-proje-yonetimi/is-akislari',
  pageKind: 'placeholder',
  owningEntity: 'project_management',
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

} as const satisfies EdenPageContract
