import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantContext } from '@/lib/tenancy/server'
import type { ProjectionDefinition } from '../projection.types'
import { fetchBranchListProjection } from './branchList.projection'

export const branchSummaryProjection: ProjectionDefinition = {
  key: 'branchSummary',
  name: 'Sirket sube ozeti projection',
  version: '2026-05-26.1',
  sourceName: 'company_branches',
  sourceType: 'fallback',
  sourceTables: ['company_branches', 'organization_units', 'company_facilities'],
  defaultSort: 'opening_registration_date',
  defaultDirection: 'desc',
  fields: [
    'total_branch_count',
    'active_branch_count',
    'official_branch_count',
    'operation_point_count',
    'closed_branch_count',
    'last_opened_branch',
    'last_closed_branch',
  ],
  tenantScoped: true,
  companyScoped: true,
  cacheMs: 60_000,
  fallback: {
    type: 'function',
    tableName: 'company_branches',
    hydrate: 'branchSummaryFallback',
  },
}

export type BranchSummaryReadModel = {
  branches: Record<string, any>[]
  branch_summary: ReturnType<typeof buildCompanyBranchSummaryProjection>
  warning?: string
}

export async function buildBranchSummaryReadModel({
  supabase,
  companyId,
  tenantContext,
}: {
  supabase: SupabaseClient
  companyId: string
  tenantContext: TenantContext
}): Promise<BranchSummaryReadModel> {
  if (!companyId) return emptyBranchSummaryReadModel()
  try {
    const projection = await fetchBranchListProjection({
      supabase,
      tenantContext,
      companyIds: [companyId],
      search: null,
      statuses: undefined,
      sort: 'opening_registration_date',
      direction: 'desc',
      from: 0,
      to: 9_999,
    })
    const branches = (projection.rows || []).map(toBranchSummaryRow)
    return {
      branches,
      branch_summary: buildCompanyBranchSummaryProjection(branches),
      ...(projection.warning ? { warning: projection.warning } : {}),
    }
  } catch {
    return emptyBranchSummaryReadModel('Sube altyapisi bulunamadigi icin branch_summary bos dondu.')
  }
}

export function emptyBranchSummaryReadModel(warning?: string): BranchSummaryReadModel {
  return {
    branches: [],
    branch_summary: buildCompanyBranchSummaryProjection([]),
    ...(warning ? { warning } : {}),
  }
}

export function buildCompanyBranchSummaryProjection(rows: Record<string, any>[]) {
  const activeRows = rows.filter(isActiveBranchSummaryRow)
  const closedRows = rows.filter(row => {
    const value = String(row.record_status || row.status || '').toLocaleLowerCase('tr-TR')
    return value === 'closed' || value === 'kapali'
  })
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

function toBranchSummaryRow(row: Record<string, any>) {
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
    address_summary: row.address_summary || [row.district, row.city].filter(Boolean).join(', ') || row.address || '',
    opening_registration_date: row.opening_registration_date,
    closing_registration_date: row.closing_registration_date,
    organization_unit_id: row.organization_unit_id,
    organization_unit_name: row.organization_unit_name || '',
    facility_id: row.facility_id,
    facility_name: row.facility_name || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_deleted: row.is_deleted,
  }
}

function isActiveBranchSummaryRow(row: Record<string, any>) {
  const values = [row.record_status, row.status].map(value => String(value || '').toLocaleLowerCase('tr-TR'))
  return !row.is_deleted && values.some(value => value === 'active' || value === 'aktif')
}
