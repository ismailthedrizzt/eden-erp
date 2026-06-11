import { listRouteReleaseConfigs } from '../../lib/release/routeReleaseRegistry'
import type { EdenReleaseRouteContract, EdenReleaseStatus } from '../core/release.contract'

const releaseStatusMap = {
  release: 'live',
  development: 'preview',
  development_demo: 'demo',
  development_internal: 'hidden',
  coming_soon: 'preview',
  hidden: 'hidden',
  broken_do_not_show: 'deprecated',
} as const satisfies Record<string, EdenReleaseStatus>

export const pageReleaseRegistryContract = listRouteReleaseConfigs().map((route) => {
  const status = releaseStatusMap[route.releaseStatus]
  return {
    route: route.route,
    status,
    productionNavigationAllowed: status === 'live' && route.showInNavigation,
    stagingNavigationAllowed: ['live', 'preview', 'demo'].includes(status) && route.showInNavigation,
    developmentNavigationAllowed: status !== 'deprecated' && route.showInNavigation,
    debugBadgeAllowedInProduction: false,
  }
}) satisfies EdenReleaseRouteContract[]

export const productionVisibleRouteContracts = pageReleaseRegistryContract.filter(
  (route) => route.productionNavigationAllowed
)

export const stagingVisibleRouteContracts = pageReleaseRegistryContract.filter(
  (route) => route.stagingNavigationAllowed
)

export const developmentVisibleRouteContracts = pageReleaseRegistryContract.filter(
  (route) => route.developmentNavigationAllowed
)
