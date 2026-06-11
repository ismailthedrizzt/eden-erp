import type { EdenReleaseStatus } from './page.contract'

export type { EdenReleaseStatus }

export interface EdenReleaseRouteContract {
  route: string
  status: EdenReleaseStatus
  productionNavigationAllowed: boolean
  stagingNavigationAllowed: boolean
  developmentNavigationAllowed: boolean
  debugBadgeAllowedInProduction: boolean
}

export const productionAllowedReleaseStatuses = ['live'] as const
export const stagingAllowedReleaseStatuses = ['live', 'preview', 'demo'] as const
export const developmentAllowedReleaseStatuses = ['live', 'preview', 'demo', 'hidden'] as const
