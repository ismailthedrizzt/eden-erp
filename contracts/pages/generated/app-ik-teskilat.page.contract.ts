import type { EdenPageContract } from '../../core/page.contract'
import { appIkTeskilatListContract } from './app-ik-teskilat.list.contract'

export const appIkTeskilatPageContract = {
  route: '/app/ik/teskilat',
  pageKind: 'list',
  owningEntity: 'hr',
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
  list: appIkTeskilatListContract,
} as const satisfies EdenPageContract
