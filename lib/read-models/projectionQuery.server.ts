import 'server-only'

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { listMeta, listRange } from '@/lib/api/listEndpoint'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { getProjectionDefinition as lookupProjectionDefinition } from './registry'
import { runProjectionFallback } from './projectionFallback'
import type {
  ProjectionDefinition,
  ProjectionListArgs,
  ProjectionListResult,
  ProjectionReadArgs,
  ProjectionResponseMeta,
} from './projection.types'

export function getProjectionDefinition(key: string) {
  return lookupProjectionDefinition(key)
}

export async function listProjectionRecordsV2(args: ProjectionListArgs): Promise<ProjectionListResult> {
  const definition = getProjectionDefinition(args.projectionKey)
  if (!definition) {
    return { ok: false, status: 500, code: 'PROJECTION_NOT_REGISTERED', error: `Projection bulunamadi: ${args.projectionKey}` }
  }

  const permission = await assertProjectionPermission(args)
  if (permission) return permission

  if (definition.companyScoped && args.scopedCompanyIds && args.scopedCompanyIds.length === 0) {
    return {
      ok: true,
      data: [],
      meta: listMeta(args.listQuery, 0),
      projection: projectionMeta(definition),
    }
  }

  if (definition.sourceType === 'fallback' || !definition.sourceName) {
    return listProjectionFallback(args, definition)
  }

  try {
    const { from, to } = listRange(args.listQuery)
    let query = args.supabase
      .from(definition.sourceName)
      .select(definition.fields.join(','), { count: 'exact' })
      .range(from, to)

    query = applyProjectionTenantScope(query, definition, args.tenantContext)
    query = applyProjectionCompanyScope(query, definition, {
      companyId: args.companyId,
      companyIds: args.scopedCompanyIds,
    })
    query = applyProjectionStatusFilters(query, definition, args.listQuery.statuses)
    query = applyProjectionSearch(query, definition, args.listQuery.search)
    query = applyProjectionExtraFilters(query, args.extraFilters)
    query = applyProjectionSort(query, definition, args.listQuery.sort, args.listQuery.direction)

    const { data, error, count } = await query
    if (error) {
      if (isMissingInfrastructureError(error)) return listProjectionFallback(args, definition)
      return { ok: false, status: 500, code: error.code || 'PROJECTION_QUERY_FAILED', error: error.message }
    }

    return {
      ok: true,
      data: data || [],
      meta: listMeta(args.listQuery, count || 0),
      projection: projectionMeta(definition),
    }
  } catch (error: any) {
    if (isMissingInfrastructureError(error)) return listProjectionFallback(args, definition)
    return {
      ok: false,
      status: 500,
      code: error?.code || 'PROJECTION_QUERY_FAILED',
      error: error?.message || 'Projection okunamadi.',
    }
  }
}

export async function readProjectionRecord(args: ProjectionReadArgs) {
  const definition = getProjectionDefinition(args.projectionKey)
  if (!definition) {
    return { ok: false, status: 500, code: 'PROJECTION_NOT_REGISTERED', error: `Projection bulunamadi: ${args.projectionKey}` }
  }

  const permission = await assertProjectionPermission(args)
  if (permission) return permission
  if (!definition.sourceName || definition.sourceType === 'fallback') {
    return { ok: false, status: 500, code: 'PROJECTION_READ_FALLBACK_UNSUPPORTED', error: 'Projection detay fallback henuz tanimli degil.' }
  }

  let query = args.supabase
    .from(definition.sourceName)
    .select(definition.fields.join(','))
    .eq('id', args.recordId)
  query = applyProjectionTenantScope(query, definition, args.tenantContext)
  query = applyProjectionCompanyScope(query, definition, { companyId: args.companyId })

  const { data, error } = await query.single()
  if (error) {
    if (error.code === 'PGRST116') return { ok: false, status: 404, code: 'RECORD_NOT_FOUND', error: 'Kayit bulunamadi.' }
    return { ok: false, status: 500, code: error.code || 'PROJECTION_READ_FAILED', error: error.message }
  }

  return { ok: true, data, projection: projectionMeta(definition) }
}

export function projectionMeta(definition: ProjectionDefinition, sourceName = definition.sourceName): ProjectionResponseMeta {
  return {
    key: definition.key,
    name: definition.name,
    version: definition.version,
    ...(sourceName ? { sourceName } : {}),
  }
}

export function applyProjectionSearch(query: any, definition: ProjectionDefinition, search?: string | null) {
  if (!search || !definition.searchableFields?.length) return query
  const sanitized = search.replace(/[%_]/g, '').trim()
  if (!sanitized) return query
  return query.or(definition.searchableFields.map(field => `${field}.ilike.%${sanitized}%`).join(','))
}

export function applyProjectionSort(
  query: any,
  definition: ProjectionDefinition,
  sort?: string | null,
  direction?: 'asc' | 'desc' | string | null
) {
  const field = sort && definition.sortableFields?.[sort]
    ? definition.sortableFields[sort]
    : definition.defaultSort || definition.fields[0]
  if (!field) return query
  return query.order(field, { ascending: (direction || definition.defaultDirection) !== 'desc' })
}

export function applyProjectionStatusFilters(query: any, definition: ProjectionDefinition, statuses?: string[] | null) {
  if (!definition.statusField || !statuses?.length) return query
  return query.in(definition.statusField, statuses)
}

export function applyProjectionTenantScope(query: any, definition: ProjectionDefinition, tenantContext: { tenantId: string }) {
  if (!definition.tenantScoped) return query
  return query.eq('tenant_id', tenantContext.tenantId)
}

export function applyProjectionCompanyScope(
  query: any,
  definition: ProjectionDefinition,
  scope: { companyId?: string; companyIds?: string[] }
) {
  if (!definition.companyScoped) return query
  if (scope.companyId) return query.eq('company_id', scope.companyId)
  if (scope.companyIds?.length) return query.in('company_id', scope.companyIds)
  return query
}

async function listProjectionFallback(args: ProjectionListArgs, definition: ProjectionDefinition): Promise<ProjectionListResult> {
  if (!definition.fallback) {
    return {
      ok: false,
      status: 500,
      code: 'PROJECTION_FALLBACK_MISSING',
      error: `${definition.key} projection kaynagi bulunamadi ve fallback tanimli degil.`,
    }
  }
  const fallback = await runProjectionFallback({ ...args, definition })
  return {
    ok: true,
    data: fallback.rows,
    meta: listMeta(args.listQuery, fallback.count),
    projection: projectionMeta(definition, definition.fallback.tableName || 'fallback'),
    fallbackUsed: true,
    warning: fallback.warning,
  }
}

async function assertProjectionPermission(args: Pick<ProjectionListArgs, 'request' | 'supabase' | 'permissionKey'>) {
  if (!args.permissionKey) return null
  const result = Array.isArray(args.permissionKey)
    ? await requireAnyPermission(args.request, args.supabase as SupabaseClient, args.permissionKey)
    : await requirePermission(args.request, args.supabase as SupabaseClient, args.permissionKey)
  if (!(result instanceof NextResponse)) return null
  let body: Record<string, any> = { error: 'Permission denied', code: 'PERMISSION_DENIED' }
  try {
    body = await result.clone().json()
  } catch {
    // Keep the standard fallback body.
  }
  return { ok: false, status: result.status, code: body.code || 'PERMISSION_DENIED', error: body.error || 'Permission denied' }
}

function applyProjectionExtraFilters(query: any, filters?: Record<string, unknown>) {
  if (!filters) return query
  return Object.entries(filters).reduce((current, [field, value]) => {
    if (value === undefined) return current
    if (value === null) return current.is(field, null)
    if (Array.isArray(value)) return value.length ? current.in(field, value) : current
    return current.eq(field, value)
  }, query)
}
