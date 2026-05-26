import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'
import { normalizeInfrastructureError } from '@/lib/setup/infrastructureErrorMapper'

export async function maybeSingleScoped(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  tableName: string,
  select: string,
  filters: Record<string, unknown>
) {
  let query = supabase.from(tableName).select(select)
  for (const [field, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) query = query.eq(field, value as any)
  }
  query = applyTenantQueryScope(query, tableName, tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) {
    const infra = normalizeInfrastructureError(error)
    if (infra.isMissing) return { data: null, missingInfrastructure: true as const, error }
    throw error
  }
  return { data: data as Record<string, any> | null, missingInfrastructure: false as const, error: null }
}

export async function listScoped(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  tableName: string,
  select: string,
  filters: Record<string, unknown>,
  options: { limit?: number } = {}
) {
  let query = supabase.from(tableName).select(select)
  for (const [field, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) query = query.eq(field, value as any)
  }
  if (options.limit) query = query.limit(options.limit)
  query = applyTenantQueryScope(query, tableName, tenantContext)
  const { data, error } = await query
  if (error) {
    const infra = normalizeInfrastructureError(error)
    if (infra.isMissing) return { data: [] as Record<string, any>[], missingInfrastructure: true as const, error }
    throw error
  }
  return { data: (data || []) as Record<string, any>[], missingInfrastructure: false as const, error: null }
}

export function isActiveStatus(row?: Record<string, any> | null) {
  if (!row) return false
  const status = normalizeRecordStatus(row.record_status || row.status || row.company_status || row.authority_record_status || row.authority_status)
  return row.is_deleted !== true
    && row.active !== false
    && !['passive', 'closed', 'deleted', 'deregistered', 'liquidation', 'terminated', 'suspended', 'expired', 'cancelled', 'failed'].includes(status)
}

export function normalizeRecordStatus(value: unknown) {
  const status = String(value || '').trim().toLocaleLowerCase('tr-TR')
  if (['aktif', 'active', 'opened', 'open'].includes(status)) return 'active'
  if (['taslak', 'draft'].includes(status)) return 'draft'
  if (['kapali', 'closed'].includes(status)) return 'closed'
  if (['pasif', 'passive', 'inactive'].includes(status)) return 'passive'
  if (['terkin', 'deregistered'].includes(status)) return 'deregistered'
  if (['tasfiye', 'liquidation'].includes(status)) return 'liquidation'
  if (['sonlandi', 'terminated'].includes(status)) return 'terminated'
  if (['askida', 'suspended'].includes(status)) return 'suspended'
  return status
}

export function sameCompany(row: Record<string, any> | null | undefined, companyId?: string | null) {
  return !!row && !!companyId && String(row.company_id || '') === String(companyId)
}

export function textEquals(a: unknown, b: unknown) {
  return String(a || '').trim().toLocaleLowerCase('tr-TR') === String(b || '').trim().toLocaleLowerCase('tr-TR')
}
