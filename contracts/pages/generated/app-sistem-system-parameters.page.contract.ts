import type { EdenPageContract } from '../../core/page.contract'
import { appSistemSystemParametersListContract } from './app-sistem-system-parameters.list.contract'
import { appSistemSystemParametersFormContract } from './app-sistem-system-parameters.form.contract'

export const appSistemSystemParametersPageContract = {
  route: '/app/sistem/system-parameters',
  pageKind: 'form',
  owningEntity: 'settings',
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
  list: appSistemSystemParametersListContract,
  form: appSistemSystemParametersFormContract,
} as const satisfies EdenPageContract
