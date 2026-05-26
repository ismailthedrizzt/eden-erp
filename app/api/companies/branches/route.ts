import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { fetchScopedCompanyIds, getTenantCompanyScope } from '@/lib/tenancy/companyScopes'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { BRANCH_PERMISSIONS, requireBranchPermission } from '@/lib/modules/companies/branchPermissions'
import { fetchBranchListProjection } from '@/lib/read-models/projections/branchList.projection'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requireBranchPermission(request, supabase, BRANCH_PERMISSIONS.view, 'companies.view')
  if (permission instanceof NextResponse) return permission

  const tenantContext = resolveTenantContext(request)
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'branch_name', direction: 'asc' })
  const companyId = searchParams.get('company_id') || undefined
  const { from, to } = listRange(listQuery)
  let scopedCompanyIds = await fetchScopedCompanyIds(supabase, tenantContext.tenantId)

  if (companyId) {
    const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
    if (!companyScope) return NextResponse.json({ error: 'Bagli sirket bulunamadi.', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    scopedCompanyIds = scopedCompanyIds.filter(id => id === companyId)
  }
  if (!scopedCompanyIds.length) return NextResponse.json({ data: [], meta: listMeta(listQuery, 0) })

  try {
    const projection = await fetchBranchListProjection({
      supabase,
      tenantContext,
      companyIds: scopedCompanyIds,
      search: listQuery.search,
      statuses: listQuery.statuses,
      sort: listQuery.sort,
      direction: listQuery.direction,
      from,
      to,
    })

    return NextResponse.json({
      data: projection.rows,
      meta: listMeta(listQuery, projection.count),
      ...(projection.warning ? { warning: projection.warning } : {}),
    })
  } catch (error: any) {
    if (isMissingInfrastructureError(error)) {
      return NextResponse.json({
        data: [],
        meta: listMeta(listQuery, 0),
        warning: 'company_branches tablosu henuz uygulanmamis.',
      })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'BRANCHES_FETCH_FAILED' }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({
    error: 'Sube serbest kayit olarak olusturulamaz. Sube Acilisi resmi islem wizardini kullanin.',
    code: 'USE_BRANCH_OPENING_WIZARD',
    message: 'Islem tamamlanamadi',
  }, { status: 409 })
}
