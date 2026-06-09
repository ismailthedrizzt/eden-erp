import {
  getCurrentReleaseEnvironment,
  isDevelopmentEnvironment,
  isReleaseEnvironment,
  isTestEnvironment,
  type ReleaseEnvironment,
} from './environment'
import {
  getRouteReleaseConfig,
  getRouteReleaseStatus,
  type ReleaseStatus,
} from './routeReleaseRegistry'
import { canSeeDevelopmentSurface, isModuleEntitled, type TenantEntitlements } from '@/lib/licensing/tenantEntitlements'

export type ReleaseVisibilitySurface = 'direct' | 'navigation' | 'search' | 'commandPalette' | 'action'

export interface ReleaseUserContext {
  permissions?: string[]
  tenantEntitlements?: TenantEntitlements | null
}

export interface ReleaseVisibilityDecision {
  visible: boolean
  enabled: boolean
  status: ReleaseStatus
  badgeLabel: string | null
  reason: string | null
  releaseReason: 'not_registered' | 'not_promoted' | 'coming_soon' | 'hidden' | 'broken' | 'permission' | null
}

const RELEASE_BLOCK_MESSAGE = 'Bu ozellik yakinda kullanima acilacaktir.'
const DEVELOPMENT_BLOCK_MESSAGE = 'Bu sayfa bu ortamda yayina alinmamis.'
const DEVELOPMENT_STATUSES = new Set<ReleaseStatus>(['development', 'development_demo', 'development_internal'])

export {
  getCurrentReleaseEnvironment,
  isDevelopmentEnvironment,
  isReleaseEnvironment,
  isTestEnvironment,
}

export function canShowRouteInEnvironment(
  route: string,
  env: ReleaseEnvironment = getCurrentReleaseEnvironment()
) {
  return getRouteReleaseDecision(route, env, 'direct').visible
}

export function canShowRouteInNavigation(
  route: string,
  env: ReleaseEnvironment = getCurrentReleaseEnvironment(),
  userContext: ReleaseUserContext = {}
) {
  return getRouteReleaseDecision(route, env, 'navigation', userContext).visible
}

export function canShowRouteInSearch(
  route: string,
  env: ReleaseEnvironment = getCurrentReleaseEnvironment(),
  userContext: ReleaseUserContext = {}
) {
  return getRouteReleaseDecision(route, env, 'search', userContext).visible
}

export function canShowRouteInCommandPalette(
  route: string,
  env: ReleaseEnvironment = getCurrentReleaseEnvironment(),
  userContext: ReleaseUserContext = {}
) {
  return getRouteReleaseDecision(route, env, 'commandPalette', userContext).visible
}

export function getRouteReleaseDecision(
  route: string,
  env: ReleaseEnvironment = getCurrentReleaseEnvironment(),
  surface: ReleaseVisibilitySurface = 'direct',
  userContext: ReleaseUserContext = {}
): ReleaseVisibilityDecision {
  const config = getRouteReleaseConfig(route)
  const status = config?.releaseStatus || 'development'
  const badgeLabel = getReleaseBadgeLabel(status, env)
  const isDevelopmentSurface = DEVELOPMENT_STATUSES.has(status)
  const canSeeInternalSurface = canSeeDevelopmentSurface(userContext.tenantEntitlements)

  if (!config) {
    return {
      visible: env !== 'release' || canSeeInternalSurface,
      enabled: env !== 'release' || canSeeInternalSurface,
      status,
      badgeLabel,
      reason: env === 'release' && !canSeeInternalSurface ? RELEASE_BLOCK_MESSAGE : DEVELOPMENT_BLOCK_MESSAGE,
      releaseReason: 'not_registered',
    }
  }

  if (status === 'broken_do_not_show') {
    return blocked(status, badgeLabel, env, 'broken')
  }

  if (status === 'hidden') {
    return blocked(status, badgeLabel, env, 'hidden')
  }

  if (!isSurfaceEnabled(config, surface)) {
    return blocked(status, badgeLabel, env, 'hidden')
  }

  if (config.requiresPermission?.length && userContext.permissions?.length && !canSeeInternalSurface) {
    const hasPermission = config.requiresPermission.some(permission => userContext.permissions?.includes(permission))
    if (!hasPermission) {
      return {
        visible: false,
        enabled: false,
        status,
        badgeLabel,
        reason: 'Bu islem icin yetkiniz bulunmuyor.',
        releaseReason: 'permission',
      }
    }
  }

  if (status === 'coming_soon') {
    const visible = env !== 'test' && (env !== 'release' || surface === 'direct')
    return {
      visible,
      enabled: false,
      status,
      badgeLabel,
      reason: env === 'release'
        ? RELEASE_BLOCK_MESSAGE
        : config.comingSoonMessage || DEVELOPMENT_BLOCK_MESSAGE,
      releaseReason: 'coming_soon',
    }
  }

  if (isDevelopmentSurface && userContext.tenantEntitlements && !canSeeInternalSurface) {
    return {
      visible: false,
      enabled: false,
      status,
      badgeLabel,
      reason: 'Bu sayfa development lisansli tenantlar icin ayrilmistir.',
      releaseReason: 'not_promoted',
    }
  }

  if (env === 'release' && status !== 'release' && !canSeeInternalSurface) {
    return {
      visible: false,
      enabled: false,
      status,
      badgeLabel,
      reason: RELEASE_BLOCK_MESSAGE,
      releaseReason: 'not_promoted',
    }
  }

  if (config.moduleKey && !config.licenseExempt) {
    const entitlement = isModuleEntitled(userContext.tenantEntitlements, config.moduleKey)
    if (!entitlement.entitled) {
      return {
        visible: false,
        enabled: false,
        status,
        badgeLabel,
        reason: entitlement.reason,
        releaseReason: 'permission',
      }
    }
  }

  return {
    visible: status === 'release'
      || status === 'development'
      || status === 'development_demo'
      || status === 'development_internal',
    enabled: true,
    status,
    badgeLabel,
    reason: null,
    releaseReason: null,
  }
}

export function getReleaseStatus(route: string): ReleaseStatus {
  return getRouteReleaseStatus(route)
}

export function getReleaseBadgeLabel(
  status: ReleaseStatus,
  env: ReleaseEnvironment = getCurrentReleaseEnvironment()
) {
  if (env === 'release') return null
  if (status === 'release') return 'release'
  if (status === 'development') return 'development'
  if (status === 'development_demo') return 'demo'
  if (status === 'development_internal') return 'internal'
  if (status === 'coming_soon') return 'coming soon'
  if (status === 'hidden') return 'hidden'
  return 'blocked'
}

export function getRouteNotAvailableHref(route: string, reason: ReleaseVisibilityDecision['releaseReason']) {
  const params = new URLSearchParams()
  params.set('from', route)
  if (reason) params.set('reason', reason)
  return `/release-not-available?${params.toString()}`
}

function isSurfaceEnabled(config: { showInNavigation: boolean; showInSearch: boolean; showInCommandPalette: boolean }, surface: ReleaseVisibilitySurface) {
  if (surface === 'navigation') return config.showInNavigation
  if (surface === 'search') return config.showInSearch
  if (surface === 'commandPalette' || surface === 'action') return config.showInCommandPalette
  return true
}

function blocked(
  status: ReleaseStatus,
  badgeLabel: string | null,
  env: ReleaseEnvironment,
  reason: ReleaseVisibilityDecision['releaseReason']
): ReleaseVisibilityDecision {
  return {
    visible: false,
    enabled: false,
    status,
    badgeLabel,
    reason: env === 'release' ? RELEASE_BLOCK_MESSAGE : DEVELOPMENT_BLOCK_MESSAGE,
    releaseReason: reason,
  }
}
