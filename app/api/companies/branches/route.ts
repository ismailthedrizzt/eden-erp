import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { fetchScopedCompanyIds, getTenantCompanyScope } from '@/lib/tenancy/companyScopes'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

export const COMPANY_BRANCH_SELECT = [
  'id',
  'tenant_id',
  'company_id',
  'organization_unit_id',
  'facility_id',
  'branch_name',
  'branch_short_name',
  'branch_type',
  'is_official_branch',
  'country',
  'city',
  'district',
  'neighborhood',
  'address',
  'postal_code',
  'phone',
  'email',
  'trade_registry_number',
  'trade_registry_office',
  'tax_office',
  'sgk_workplace_registry_no',
  'opening_decision_date',
  'opening_registration_date',
  'closing_decision_date',
  'closing_registration_date',
  'trade_registry_gazette_date',
  'trade_registry_gazette_number',
  'responsible_person_id',
  'status',
  'record_status',
  'start_date',
  'end_date',
  'notes',
  'document_files',
  'metadata_json',
  'created_at',
  'updated_at',
  'version',
  'is_deleted',
].join(',')

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'companies.view')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'branch_name', direction: 'asc' })
  const companyId = searchParams.get('company_id') || undefined
  const { from, to } = listRange(listQuery)
  let scopedCompanyIds = await fetchScopedCompanyIds(supabase, tenantContext.tenantId)
  if (companyId) {
    const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
    if (!companyScope) return NextResponse.json({ error: 'Bağlı şirket bulunamadı.', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    scopedCompanyIds = scopedCompanyIds.filter(id => id === companyId)
  }
  if (!scopedCompanyIds.length) return NextResponse.json({ data: [], meta: listMeta(listQuery, 0) })

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
    .in('company_id', scopedCompanyIds)
    .eq('is_deleted', false)
    .order(sortMap[listQuery.sort || ''] || 'branch_name', { ascending: listQuery.direction !== 'desc' })
    .range(from, to)
  if (listQuery.search) {
    const search = listQuery.search.replace(/[%_]/g, '')
    query = query.or(`branch_name.ilike.%${search}%,branch_short_name.ilike.%${search}%,city.ilike.%${search}%,district.ilike.%${search}%,address.ilike.%${search}%`)
  }
  if (listQuery.statuses?.length) query = query.in('record_status', listQuery.statuses)
  query = applyTenantQueryScope(query, 'company_branches', tenantContext)
  const { data, error, count } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) return NextResponse.json({ data: [], meta: listMeta(listQuery, 0), warning: 'company_branches tablosu henüz uygulanmamış.' })
    return NextResponse.json({ error: error.message, code: error.code || 'BRANCHES_FETCH_FAILED' }, { status: 500 })
  }
  const rows = await attachBranchReferences(supabase, data || [], tenantContext)
  return NextResponse.json({ data: rows, meta: listMeta(listQuery, count || 0) })
}

export async function POST() {
  return NextResponse.json({
    error: 'Şube serbest kayıt olarak oluşturulamaz. Şube Açılışı resmi işlem wizardını kullanın.',
    code: 'USE_BRANCH_OPENING_WIZARD',
    message: 'İşlem tamamlanamadı',
  }, { status: 409 })
}

async function attachBranchReferences(
  supabase: ReturnType<typeof createServiceClient>,
  rows: Record<string, any>[],
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  if (!rows.length) return rows
  const companyIds = unique(rows.map(row => row.company_id))
  const unitIds = unique(rows.map(row => row.organization_unit_id))
  let companiesQuery = supabase.from('companies').select('id,trade_name,short_name').in('id', companyIds)
  companiesQuery = applyTenantQueryScope(companiesQuery, 'companies', tenantContext)
  let unitsQuery = unitIds.length ? supabase.from('organization_units').select('id,name,short_name,type,status').in('id', unitIds) : null
  if (unitsQuery) unitsQuery = applyTenantQueryScope(unitsQuery, 'organization_units', tenantContext)
  const [companies, units] = await Promise.all([companiesQuery, unitsQuery || Promise.resolve({ data: [], error: null })])
  const companyById = new Map((companies.data || []).map((company: any) => [company.id, company]))
  const unitById = new Map((units.data || []).map((unit: any) => [unit.id, unit]))
  return rows.map(row => {
    const company = companyById.get(row.company_id)
    const unit = row.organization_unit_id ? unitById.get(row.organization_unit_id) : null
    return {
      ...row,
      company,
      company_name: company?.trade_name || company?.short_name || '',
      organization_unit: unit || null,
      organization_unit_name: unit?.name || '',
      facility_name: row.metadata_json?.facility_name || '',
      address_summary: [row.district, row.city].filter(Boolean).join(', '),
      last_operation: row.record_status === 'closed' ? 'branch_closing' : 'branch_opening',
    }
  })
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))
}
