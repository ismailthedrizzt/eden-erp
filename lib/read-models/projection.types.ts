import type { NextRequest } from 'next/server'
export type LegacySupabaseClient = any
import type { ListMeta, ListQuery, ListSortDirection } from '@/lib/api/listEndpoint'
import type { TenantContext } from '@/lib/tenancy/server'

export type ProjectionSourceType = 'table' | 'view' | 'rpc' | 'fallback'
export type ProjectionFallbackType = 'query_builder' | 'function'

export interface ProjectionFallbackDefinition {
  type: ProjectionFallbackType
  tableName?: string
  select?: string
  hydrate?: string
}

export interface ProjectionDefinition {
  key: string
  name: string
  version: string
  sourceName?: string
  sourceType: ProjectionSourceType
  sourceTables: string[]
  defaultSort?: string
  defaultDirection?: ListSortDirection
  fields: string[]
  searchableFields?: string[]
  sortableFields?: Record<string, string>
  statusField?: string
  tenantScoped: boolean
  companyScoped?: boolean
  cacheMs?: number
  fallback?: ProjectionFallbackDefinition
}

export interface ProjectionListArgs {
  supabase: LegacySupabaseClient
  request: NextRequest
  projectionKey: string
  permissionKey?: string | string[]
  tenantContext: TenantContext
  listQuery: ListQuery
  companyId?: string
  scopedCompanyIds?: string[]
  extraFilters?: Record<string, unknown>
}

export interface ProjectionListResult {
  ok: boolean
  data?: Record<string, any>[]
  meta?: ListMeta
  projection?: ProjectionResponseMeta
  error?: string
  code?: string
  status?: number
  fallbackUsed?: boolean
  warning?: string
}

export interface ProjectionReadArgs {
  supabase: LegacySupabaseClient
  request: NextRequest
  projectionKey: string
  permissionKey?: string | string[]
  tenantContext: TenantContext
  recordId: string
  companyId?: string
}

export interface ProjectionResponseMeta {
  key: string
  name: string
  version: string
  sourceName?: string
}
