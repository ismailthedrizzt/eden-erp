'use client'

import {
  TENANT_ID_HEADER,
  TENANT_STORAGE_KEY,
  WORKSPACE_ID_HEADER,
} from './constants'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeTenantId(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || !UUID_PATTERN.test(trimmed)) return null
  return trimmed
}

export function getStoredTenantId() {
  if (typeof window === 'undefined') return null
  return normalizeTenantId(window.localStorage.getItem(TENANT_STORAGE_KEY))
}

export function setStoredTenantId(tenantId: string | null) {
  if (typeof window === 'undefined') return
  const normalized = normalizeTenantId(tenantId)
  if (!normalized) {
    window.localStorage.removeItem(TENANT_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(TENANT_STORAGE_KEY, normalized)
}

export function tenantRequestHeaders(tenantId?: string | null) {
  const resolvedTenantId = normalizeTenantId(tenantId) || getStoredTenantId()
  if (!resolvedTenantId) return {}

  return {
    [TENANT_ID_HEADER]: resolvedTenantId,
    [WORKSPACE_ID_HEADER]: resolvedTenantId,
  }
}
