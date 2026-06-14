import type { EdenPageContract } from '../../core/page.contract'

export const adminConsoleTechnicalPageContract = {
  route: '/app/sistem/teknik',
  pageKind: 'dashboard',
  owningEntity: 'adminConsole',
  allowedActions: ['open_technical_settings'],
  requiredComponents: ['AdminConsolePage'],
  requiredStates: { empty: true, loading: true, error: true },
  releaseStatus: 'hidden',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  adminConsole: { section: 'technical' },
} as const satisfies EdenPageContract & { adminConsole: { section: 'technical' } }
