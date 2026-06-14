import type { EdenPageContract } from '../../core/page.contract'

export const dashboardRedirectPageContract = {
  route: '/app/dashboard',
  pageKind: 'redirect',
  owningEntity: 'reporting',
  allowedActions: ['redirect_to_home_dashboard'],
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
    reason: 'Dashboard legacy route is a compatibility redirect to the contracted home dashboard.',
  },
} as const satisfies EdenPageContract & {
  redirect: {
    targetRoute: string
    reason: string
  }
}
