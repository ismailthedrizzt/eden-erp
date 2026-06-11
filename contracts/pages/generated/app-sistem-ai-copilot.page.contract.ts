import type { EdenPageContract } from '../../core/page.contract'

export const appSistemAiCopilotPageContract = {
  route: '/app/sistem/ai-copilot',
  pageKind: 'placeholder',
  owningEntity: 'aiCopilot',
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
