import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'
import type { ReadModelProjection } from '../registry'

export const companyDetailProjection: ReadModelProjection = {
  key: 'companyDetail',
  name: 'Sirket detay projection',
  version: 1,
  sources: ['companies', 'company_branches', 'organization_units', 'company_facilities'],
  fallbackQuery: 'company detail route related sections',
  cacheDurationSeconds: 0,
  fields: ['branches', 'branch_summary'],
  refreshStrategy: 'outbox_invalidation',
}

export async function hydrateCompanyBranchesForDetailProjection(
  supabase: SupabaseClient,
  rows: Record<string, any>[],
  tenantContext: TenantContext
) {
  if (!rows.length) return []
  const unitIds = uniqueIds(rows.map(row => row.organization_unit_id))
  const facilityIds = uniqueIds(rows.map(row => row.facility_id))
  let unitQuery = unitIds.length
    ? supabase.from('organization_units').select('id,name,short_name,type,status').in('id', unitIds)
    : null
  if (unitQuery) unitQuery = applyTenantQueryScope(unitQuery, 'organization_units', tenantContext)
  let facilityQuery = facilityIds.length
    ? supabase.from('company_facilities').select('id,facility_name,status,record_status').in('id', facilityIds)
    : null
  if (facilityQuery) facilityQuery = applyTenantQueryScope(facilityQuery, 'company_facilities', tenantContext)

  const [units, facilities] = await Promise.all([
    unitQuery || Promise.resolve({ data: [], error: null }),
    facilityQuery || Promise.resolve({ data: [], error: null }),
  ])
  const unitById = new Map((units.data || []).map((unit: any) => [unit.id, unit]))
  const facilityById = new Map((facilities.data || []).map((facility: any) => [facility.id, facility]))

  return rows.map(row => {
    const unit = row.organization_unit_id ? unitById.get(row.organization_unit_id) : null
    const facility = row.facility_id ? facilityById.get(row.facility_id) : null
    return {
      id: row.id,
      branch_name: row.branch_name,
      branch_short_name: row.branch_short_name,
      branch_type: row.branch_type,
      is_official_branch: row.is_official_branch,
      record_status: row.record_status,
      status: row.status,
      city: row.city,
      district: row.district,
      address_summary: [row.district, row.city].filter(Boolean).join(', ') || row.address || '',
      opening_registration_date: row.opening_registration_date,
      closing_registration_date: row.closing_registration_date,
      organization_unit_id: row.organization_unit_id,
      organization_unit_name: unit?.name || '',
      facility_id: row.facility_id,
      facility_name: facility?.facility_name || row.metadata_json?.facility_name || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })
}

export function buildCompanyBranchSummaryProjection(rows: Record<string, any>[]) {
  const activeRows = rows.filter(isActiveBranchSummaryRow)
  const closedRows = rows.filter(row => String(row.record_status || row.status).toLocaleLowerCase('tr-TR') === 'closed')
  const officialRows = activeRows.filter(row => row.is_official_branch)
  const operationPointRows = activeRows.filter(row => ['liaison_office', 'operation_point'].includes(String(row.branch_type || '')))
  const byOpeningDate = [...rows]
    .filter(row => row.opening_registration_date || row.created_at)
    .sort((left, right) => String(right.opening_registration_date || right.created_at || '').localeCompare(String(left.opening_registration_date || left.created_at || '')))
  const byClosingDate = [...closedRows]
    .filter(row => row.closing_registration_date || row.updated_at)
    .sort((left, right) => String(right.closing_registration_date || right.updated_at || '').localeCompare(String(left.closing_registration_date || left.updated_at || '')))

  return {
    total_branch_count: rows.length,
    active_branch_count: activeRows.length,
    official_branch_count: officialRows.length,
    operation_point_count: operationPointRows.length,
    closed_branch_count: closedRows.length,
    last_opened_branch: byOpeningDate[0] || null,
    last_closed_branch: byClosingDate[0] || null,
  }
}

function isActiveBranchSummaryRow(row: Record<string, any>) {
  const values = [row.record_status, row.status].map(value => String(value || '').toLocaleLowerCase('tr-TR'))
  return !row.is_deleted && values.some(value => value === 'active' || value === 'aktif')
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))
}
