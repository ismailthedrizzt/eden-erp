import type { EdenPageContract } from '../../core/page.contract'

export const adminConsoleWorkspacePageContract = {
  route: '/app/sistem/genel',
  pageKind: 'dashboard',
  owningEntity: 'adminConsole',
  allowedActions: ['open_workspace_settings'],
  requiredComponents: ['AdminConsolePage'],
  requiredStates: { empty: true, loading: true, error: true },
  releaseStatus: 'hidden',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  adminConsole: { section: 'workspace' },
} as const satisfies EdenPageContract & { adminConsole: { section: 'workspace' } }
