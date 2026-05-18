import 'server-only'

import type { NextRequest } from 'next/server'
import type { TenantIsolationMode } from '@/packages/shared/src'
import {
  DEFAULT_TENANT_ID,
  TENANT_ID_COOKIE,
  TENANT_ID_HEADER,
  TENANT_SCHEMA_HEADER,
  WORKSPACE_ID_COOKIE,
  WORKSPACE_ID_HEADER,
} from './constants'

export type TenantResolutionSource = 'header' | 'cookie' | 'env' | 'default'

export interface TenantContext {
  tenantId: string
  workspaceId: string
  schemaName: string
  isolationMode: TenantIsolationMode
  source: TenantResolutionSource
  isDefault: boolean
  activation: {
    headerForwarding: boolean
    tenantColumnWrites: boolean
    tenantFiltering: boolean
    databaseRouting: boolean
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function envDefaultTenantId() {
  return process.env.EDEN_DEFAULT_TENANT_ID
    || process.env.DEFAULT_TENANT_ID
    || process.env.DEFAULT_INSTANCE_ID
    || DEFAULT_TENANT_ID
}

function envIsolationMode(): TenantIsolationMode {
  const value = process.env.EDEN_TENANCY_ISOLATION_MODE
  if (value === 'dedicated_schema' || value === 'dedicated_database') return value
  return 'shared_schema'
}

function normalizeTenantId(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || !UUID_PATTERN.test(trimmed)) return null
  return trimmed
}

function headerValue(headers: Headers | null | undefined, name: string) {
  return headers?.get(name) || null
}

function cookieValue(request: NextRequest | undefined, name: string) {
  return request?.cookies.get(name)?.value || null
}

export function tenantColumnWritesEnabled() {
  return process.env.EDEN_TENANT_COLUMN_WRITES === 'true'
}

export function tenantFilteringEnabled() {
  return process.env.EDEN_TENANT_FILTERING === 'true'
}

export function databaseRoutingEnabled() {
  return process.env.EDEN_TENANT_DATABASE_ROUTING === 'true'
}

export function resolveTenantContext(request?: NextRequest): TenantContext {
  const fromHeader = normalizeTenantId(
    headerValue(request?.headers, TENANT_ID_HEADER)
      || headerValue(request?.headers, WORKSPACE_ID_HEADER)
  )
  const fromCookie = normalizeTenantId(
    cookieValue(request, TENANT_ID_COOKIE)
      || cookieValue(request, WORKSPACE_ID_COOKIE)
  )
  const fromEnv = normalizeTenantId(envDefaultTenantId())

  const tenantId = fromHeader || fromCookie || fromEnv || DEFAULT_TENANT_ID
  const source: TenantResolutionSource = fromHeader ? 'header' : fromCookie ? 'cookie' : fromEnv ? 'env' : 'default'
  const schemaHeader = process.env.EDEN_ALLOW_TENANT_SCHEMA_HEADER === 'true'
    ? request?.headers.get(TENANT_SCHEMA_HEADER)
    : null

  return {
    tenantId,
    workspaceId: tenantId,
    schemaName: schemaHeader || process.env.EDEN_TENANT_SCHEMA || 'public',
    isolationMode: envIsolationMode(),
    source,
    isDefault: tenantId === DEFAULT_TENANT_ID,
    activation: {
      headerForwarding: true,
      tenantColumnWrites: tenantColumnWritesEnabled(),
      tenantFiltering: tenantFilteringEnabled(),
      databaseRouting: databaseRoutingEnabled(),
    },
  }
}

export function tenantResponseHeaders(context: TenantContext) {
  return {
    [TENANT_ID_HEADER]: context.tenantId,
    [WORKSPACE_ID_HEADER]: context.workspaceId,
  }
}

export function withTenantInsertScope<T extends Record<string, unknown>>(row: T, context: TenantContext): T & { tenant_id?: string } {
  if (!tenantColumnWritesEnabled()) return row
  return { ...row, tenant_id: context.tenantId }
}

export function withTenantWorkspaceInsertScope<T extends Record<string, unknown>>(row: T, context: TenantContext): T & { tenant_workspace_id?: string } {
  if (!tenantColumnWritesEnabled()) return row
  return { ...row, tenant_workspace_id: context.workspaceId }
}
