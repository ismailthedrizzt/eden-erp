import type { EdenPageContract } from '../../core/page.contract'

export const adminConsolePageContract = {
  route: '/app/sistem',
  pageKind: 'dashboard',
  owningEntity: 'adminConsole',
  allowedActions: ['open_admin_console_dashboard'],
  requiredComponents: ['AdminConsolePage'],
  requiredStates: { empty: true, loading: true, error: true },
  releaseStatus: 'hidden',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  adminConsole: { section: 'dashboard' },
} as const satisfies EdenPageContract & { adminConsole: { section: 'dashboard' } }
