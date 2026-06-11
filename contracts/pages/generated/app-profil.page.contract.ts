import type { EdenPageContract } from '../../core/page.contract'
import { appProfilFormContract } from './app-profil.form.contract'

export const appProfilPageContract = {
  route: '/app/profil',
  pageKind: 'form',
  owningEntity: 'security',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: true,
    error: true,
  },
  releaseStatus: 'live',
  visibleInProduction: true,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  form: appProfilFormContract,
} as const satisfies EdenPageContract
