import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { applyTenantQueryScope, type TenantContext } from '@/lib/tenancy/server'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { COMPANY_BRANCH_SELECT } from '@/lib/modules/companies/companyBranchSelect'
import type { ReadModelProjection } from '../registry'

export const branchListProjection: ReadModelProjection = {
  key: 'branchList',
  name: 'Subelerimiz liste projection',
  version: 1,
  sources: ['company_branches', 'companies', 'organization_units', 'company_facilities', 'company_official_change_transactions'],
  fallbackQuery: 'company_branches + reference hydration',
  cacheDurationSeconds: 0,
  fields: [
    'id',
    'company_id',
    'company_name',
    'branch_name',
    'branch_short_name',
    'branch_type',
    'is_official_branch',
    'record_status',
    'status',
    'city',
    'district',
    'address_summary',
    'phone',
    'email',
    'opening_registration_date',
    'closing_registration_date',
    'organization_unit_id',
    'organization_unit_name',
    'facility_id',
    'facility_name',
    'last_operation',
    'updated_at',
    'version',
  ],
  refreshStrategy: 'outbox_invalidation',
}

export async function fetchBranchListProjection({
  supabase,
  tenantContext,
  companyIds,
  search,
  statuses,
  sort,
  direction,
  from,
  to,
}: {
  supabase: SupabaseClient
  tenantContext: TenantContext
  companyIds: string[]
  search?: string | null
  statuses?: string[]
  sort?: string | null
  direction?: 'asc' | 'desc' | string | null
  from: number
  to: number
}) {
  if (!companyIds.length) return { rows: [] as Record<string, any>[], count: 0 }

  const sortMap: Record<string, string> = {
    branch_name: 'branch_name',
    branch_short_name: 'branch_short_name',
    city: 'city',
    district: 'district',
    status: 'record_status',
    opening_registration_date: 'opening_registration_date',
    created_at: 'created_at',
    updated_at: 'updated_at',
  }
  let query = supabase
    .from('company_branches')
    .select(COMPANY_BRANCH_SELECT, { count: 'exact' })
    .in('company_id', companyIds)
    .eq('is_deleted', false)
    .order(sortMap[sort || ''] || 'branch_name', { ascending: direction !== 'desc' })
    .range(from, to)

  if (search) {
    const sanitized = search.replace(/[%_]/g, '')
    query = query.or(`branch_name.ilike.%${sanitized}%,branch_short_name.ilike.%${sanitized}%,city.ilike.%${sanitized}%,district.ilike.%${sanitized}%,address.ilike.%${sanitized}%`)
  }
  if (statuses?.length) query = query.in('record_status', statuses)
  query = applyTenantQueryScope(query, 'company_branches', tenantContext)

  const { data, error, count } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) return { rows: [], count: 0, warning: 'company_branches tablosu henuz uygulanmamis.' }
    throw error
  }

  return {
    rows: await attachBranchProjectionReferences(supabase, data || [], tenantContext),
    count: count || 0,
  }
}

export async function attachBranchProjectionReferences(
  supabase: SupabaseClient,
  rows: Record<string, any>[],
  tenantContext: TenantContext
) {
  if (!rows.length) return rows
  const companyIds = unique(rows.map(row => row.company_id))
  const unitIds = unique(rows.map(row => row.organization_unit_id))
  const facilityIds = unique(rows.map(row => row.facility_id))
  const branchIds = unique(rows.map(row => row.id))

  let companiesQuery = supabase.from('companies').select('id,trade_name,short_name').in('id', companyIds)
  companiesQuery = applyTenantQueryScope(companiesQuery, 'companies', tenantContext)
  let unitsQuery = unitIds.length ? supabase.from('organization_units').select('id,name,short_name,type,status').in('id', unitIds) : null
  if (unitsQuery) unitsQuery = applyTenantQueryScope(unitsQuery, 'organization_units', tenantContext)
  let facilitiesQuery = facilityIds.length ? supabase.from('company_facilities').select('id,facility_name,status,record_status').in('id', facilityIds) : null
  if (facilitiesQuery) facilitiesQuery = applyTenantQueryScope(facilitiesQuery, 'company_facilities', tenantContext)
  let transactionsQuery = branchIds.length
    ? supabase
      .from('company_official_change_transactions')
      .select('id,branch_id,transaction_type,created_at')
      .in('branch_id', branchIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    : null
  if (transactionsQuery) transactionsQuery = applyTenantQueryScope(transactionsQuery, 'company_official_change_transactions', tenantContext)

  const [companies, units, facilities, transactions] = await Promise.all([
    companiesQuery,
    unitsQuery || Promise.resolve({ data: [], error: null }),
    facilitiesQuery || Promise.resolve({ data: [], error: null }),
    transactionsQuery || Promise.resolve({ data: [], error: null }),
  ])

  const companyById = new Map((companies.data || []).map((company: any) => [company.id, company]))
  const unitById = new Map((units.data || []).map((unit: any) => [unit.id, unit]))
  const facilityById = new Map((facilities.data || []).map((facility: any) => [facility.id, facility]))
  const lastTransactionByBranch = new Map<string, any>()
  for (const transaction of transactions.data || []) {
    if (transaction.branch_id && !lastTransactionByBranch.has(transaction.branch_id)) {
      lastTransactionByBranch.set(transaction.branch_id, transaction)
    }
  }

  return rows.map(row => {
    const company = companyById.get(row.company_id)
    const unit = row.organization_unit_id ? unitById.get(row.organization_unit_id) : null
    const facility = row.facility_id ? facilityById.get(row.facility_id) : null
    const lastTransaction = lastTransactionByBranch.get(row.id)
    return {
      ...row,
      company,
      company_name: company?.trade_name || company?.short_name || '',
      organization_unit: unit || null,
      organization_unit_name: unit?.name || '',
      facility: facility || null,
      facility_name: facility?.facility_name || row.metadata_json?.facility_name || '',
      address_summary: [row.district, row.city].filter(Boolean).join(', ') || row.address || '',
      last_operation: lastTransaction?.transaction_type || (row.record_status === 'closed' ? 'branch_closing' : 'branch_opening'),
    }
  })
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))
}
