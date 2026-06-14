import type { EdenPageContract } from '../../core/page.contract'

export const loginPageContract = {
  route: '/login',
  pageKind: 'shell',
  owningEntity: 'auth',
  allowedActions: ['authenticate'],
  requiredComponents: ['LoginExperience'],
  requiredStates: {
    empty: false,
    loading: true,
    error: true,
  },
  releaseStatus: 'live',
  visibleInProduction: true,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  auth: {
    primaryExperienceComponent: 'LoginExperience',
  },
} as const satisfies EdenPageContract & {
  auth: {
    primaryExperienceComponent: 'LoginExperience'
  }
}
