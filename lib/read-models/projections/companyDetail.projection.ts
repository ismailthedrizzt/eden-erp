import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import type { ProjectionDefinition } from '../projection.types'
import {
  buildBranchSummaryReadModel,
  buildCompanyBranchSummaryProjection as buildBranchSummaryProjection,
} from './branchSummary.projection'

export const companyDetailProjection: ProjectionDefinition = {
  key: 'companyDetail',
  name: 'Sirket detay projection',
  version: '2026-05-26.1',
  sourceName: 'companies',
  sourceType: 'table',
  sourceTables: ['companies', 'company_partners', 'company_representatives', 'stakeholders', 'company_branches', 'organization_units', 'company_facilities'],
  fields: ['company', 'partners', 'representatives', 'stakeholders', 'public_sections', 'current_ownership', 'lifecycle_events', 'company_nace_codes', 'branches', 'branch_summary'],
  tenantScoped: true,
  companyScoped: false,
  cacheMs: 60_000,
  fallback: {
    type: 'function',
    tableName: 'companies',
    hydrate: 'companyDetailFallback',
  },
}

export async function buildCompanyDetailReadModel({
  supabase,
  company,
  tenantContext,
  related,
}: {
  supabase: SupabaseClient
  company: Record<string, any>
  tenantContext: TenantContext
  related?: Record<string, any>
}) {
  const branchReadModel = await buildBranchSummaryReadModel({
    supabase,
    companyId: company.id,
    tenantContext,
  })
  return {
    ...company,
    ...(related || {}),
    branches: branchReadModel.branches,
    branch_summary: branchReadModel.branch_summary,
    ...(branchReadModel.warning ? { projection_warning: branchReadModel.warning } : {}),
  }
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
    runProjectionQuery(unitQuery),
    runProjectionQuery(facilityQuery),
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
  return buildBranchSummaryProjection(rows)
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))
}

async function runProjectionQuery(query: any): Promise<{ data: any[]; error: null }> {
  if (!query) return { data: [], error: null }
  const { data, error } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) return { data: [], error: null }
    throw error
  }
  return { data: data || [], error: null }
}
