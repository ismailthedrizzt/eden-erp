import type { EdenPageContract } from '../../core/page.contract'
import { appSistemAuditListContract } from './app-sistem-audit.list.contract'

export const appSistemAuditPageContract = {
  route: '/app/sistem/audit',
  pageKind: 'list',
  owningEntity: 'audit',
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
  list: appSistemAuditListContract,
} as const satisfies EdenPageContract
