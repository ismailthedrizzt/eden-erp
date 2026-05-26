import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ListQuery } from '@/lib/api/listEndpoint'
import { listRange } from '@/lib/api/listEndpoint'
import type { ProjectionDefinition } from './projection.types'
import type { TenantContext } from '@/lib/tenancy/server'
import { fetchBranchListProjection } from './projections/branchList.projection'

export interface ProjectionFallbackArgs {
  supabase: SupabaseClient
  definition: ProjectionDefinition
  tenantContext: TenantContext
  listQuery: ListQuery
  companyId?: string
  scopedCompanyIds?: string[]
  extraFilters?: Record<string, unknown>
}

export async function runProjectionFallback(args: ProjectionFallbackArgs) {
  const hydrate = args.definition.fallback?.hydrate
  if (hydrate === 'branchListFallback') return branchListFallback(args)
  if (args.definition.fallback?.type === 'query_builder') return queryBuilderFallback(args)
  return genericEmptyFallback(args.definition)
}

async function branchListFallback({
  supabase,
  tenantContext,
  listQuery,
  companyId,
  scopedCompanyIds,
}: ProjectionFallbackArgs) {
  const { from, to } = listRange(listQuery)
  const companyIds = Array.from(new Set([
    ...(scopedCompanyIds || []),
    ...(companyId ? [companyId] : []),
  ].filter(Boolean))) as string[]

  return fetchBranchListProjection({
    supabase,
    tenantContext,
    companyIds,
    search: listQuery.search,
    statuses: listQuery.statuses,
    sort: listQuery.sort,
    direction: listQuery.direction,
    from,
    to,
  })
}

function genericEmptyFallback(definition: ProjectionDefinition) {
  return {
    rows: [] as Record<string, any>[],
    count: 0,
    warning: `${definition.key} projection fallback henuz tanimli degil.`,
  }
}

async function queryBuilderFallback({
  supabase,
  definition,
  tenantContext,
  listQuery,
  companyId,
  scopedCompanyIds,
  extraFilters,
}: ProjectionFallbackArgs) {
  const tableName = definition.fallback?.tableName
  if (!tableName) return genericEmptyFallback(definition)
  const { from, to } = listRange(listQuery)
  const select = definition.fallback?.select || definition.fields.join(',')
  let query = supabase.from(tableName).select(select, { count: 'exact' }).range(from, to)
  if (definition.tenantScoped) query = query.eq('tenant_id', tenantContext.tenantId)
  if (definition.companyScoped) {
    if (companyId) query = query.eq('company_id', companyId)
    else if (scopedCompanyIds?.length) query = query.in('company_id', scopedCompanyIds)
  }
  if (definition.statusField && listQuery.statuses?.length) query = query.in(definition.statusField, listQuery.statuses)
  if (listQuery.search && definition.searchableFields?.length) {
    const sanitized = listQuery.search.replace(/[%_]/g, '').trim()
    if (sanitized) query = query.or(definition.searchableFields.map(field => `${field}.ilike.%${sanitized}%`).join(','))
  }
  if (extraFilters) {
    for (const [field, value] of Object.entries(extraFilters)) {
      if (value === undefined) continue
      if (value === null) query = query.is(field, null)
      else if (Array.isArray(value)) query = value.length ? query.in(field, value) : query
      else query = query.eq(field, value)
    }
  }
  const sortField = listQuery.sort && definition.sortableFields?.[listQuery.sort]
    ? definition.sortableFields[listQuery.sort]
    : definition.defaultSort
  if (sortField) query = query.order(sortField, { ascending: (listQuery.direction || definition.defaultDirection) !== 'desc' })

  const { data, error, count } = await query
  if (error) throw error
  return {
    rows: data || [],
    count: count || 0,
    warning: `${definition.key} projection kaynagi kullanilamadigi icin fallback query calisti.`,
  }
}
