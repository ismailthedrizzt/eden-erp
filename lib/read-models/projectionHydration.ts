import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'

export function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))
}

export function indexRowsById<T extends Record<string, any>>(rows: T[]) {
  return new Map(rows.map(row => [row.id, row]))
}

export async function runOptionalProjectionQuery(query: any): Promise<Record<string, any>[]> {
  if (!query) return []
  const { data, error } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) return []
    throw error
  }
  return data || []
}

export async function hydrateProjectionReferences({
  supabase,
  tableName,
  select,
  ids,
  tenantContext,
}: {
  supabase: SupabaseClient
  tableName: string
  select: string
  ids: string[]
  tenantContext: TenantContext
}) {
  if (!ids.length) return new Map<string, Record<string, any>>()
  let query = supabase.from(tableName).select(select).in('id', ids)
  query = applyTenantQueryScope(query, tableName, tenantContext)
  return indexRowsById(await runOptionalProjectionQuery(query))
}
