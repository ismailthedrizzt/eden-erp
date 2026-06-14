import type { EdenPageContract } from '../../core/page.contract'

export const onboardingRedirectPageContract = {
  route: '/app/onboarding',
  pageKind: 'redirect',
  owningEntity: 'settings',
  allowedActions: ['redirect_to_setup_home'],
  requiredComponents: ['NextRedirect'],
  requiredStates: {
    empty: false,
    loading: false,
    error: false,
  },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  redirect: {
    targetRoute: '/app',
    reason: 'Onboarding route is retained as a development compatibility redirect into the contracted home surface.',
  },
} as const satisfies EdenPageContract & {
  redirect: {
    targetRoute: string
    reason: string
  }
}
