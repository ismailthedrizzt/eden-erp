export type TenantLicenseStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled'
  | 'expired'
  | 'development'
  | 'internal'
  | 'archived'

export interface TenantEntitlements {
  tenant_id?: string
  product_key: string
  plan_key: string
  license_status: TenantLicenseStatus | string
  is_development: boolean
  enabled_modules: string[]
  enabled_features: string[]
  limits: Record<string, number | null | undefined>
  source?: string
  warnings?: string[]
}

export interface EntitlementDecision {
  entitled: boolean
  reason: string | null
  status: 'entitled' | 'unlicensed' | 'suspended'
}

const BLOCKED_LICENSE_STATUSES = new Set(['suspended', 'cancelled', 'expired', 'archived'])

export function isLicenseBlocked(status: string | undefined | null) {
  return BLOCKED_LICENSE_STATUSES.has(String(status || '').toLowerCase())
}

export function isModuleEntitled(entitlements: TenantEntitlements | null | undefined, moduleKey?: string | null): EntitlementDecision {
  if (!moduleKey) return { entitled: true, reason: null, status: 'entitled' }
  if (!entitlements) return { entitled: true, reason: null, status: 'entitled' }
  if (isLicenseBlocked(entitlements.license_status)) {
    return {
      entitled: false,
      reason: 'Lisans durumu aktif olmadığı için modül erişimi kapalı.',
      status: 'suspended',
    }
  }
  if (entitlements.is_development) {
    return { entitled: true, reason: null, status: 'entitled' }
  }
  if (entitlements.enabled_modules.includes(moduleKey)) {
    return { entitled: true, reason: null, status: 'entitled' }
  }
  return {
    entitled: false,
    reason: 'Bu modül mevcut lisans planınızda aktif değildir.',
    status: 'unlicensed',
  }
}

export function isFeatureEntitled(entitlements: TenantEntitlements | null | undefined, featureKey?: string | null): EntitlementDecision {
  if (!featureKey) return { entitled: true, reason: null, status: 'entitled' }
  if (!entitlements) return { entitled: true, reason: null, status: 'entitled' }
  if (isLicenseBlocked(entitlements.license_status)) {
    return {
      entitled: false,
      reason: 'Lisans durumu aktif olmadığı için özellik erişimi kapalı.',
      status: 'suspended',
    }
  }
  if (entitlements.is_development) {
    return { entitled: true, reason: null, status: 'entitled' }
  }
  if (entitlements.enabled_features.includes(featureKey)) {
    return { entitled: true, reason: null, status: 'entitled' }
  }
  return {
    entitled: false,
    reason: 'Bu özellik mevcut lisans planınızda aktif değildir.',
    status: 'unlicensed',
  }
}

export function canSeeDevelopmentSurface(entitlements: TenantEntitlements | null | undefined) {
  return Boolean(entitlements?.is_development)
}
