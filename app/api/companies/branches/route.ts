import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listMeta, parseListQuery } from '@/lib/api/listEndpoint'
import { resolveTenantContext } from '@/lib/tenancy/server'
import { fetchScopedCompanyIds, getTenantCompanyScope } from '@/lib/tenancy/companyScopes'
import { BRANCH_PERMISSIONS } from '@/lib/modules/companies/branchPermissions'
import { requireModuleAvailable } from '@/lib/modules/moduleGuards'
import { listProjectionRecordsV2, projectionMeta } from '@/lib/read-models/projectionQuery.server'
import { branchListProjection } from '@/lib/read-models/projections/branchList.projection'
import { requireBranchPolicy } from '@/lib/security/policies/branchPolicies'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const policy = await requireBranchPolicy({ request, supabase, actionKey: 'branch.view' })
  if (policy instanceof Response) return policy

  const tenantContext = resolveTenantContext(request)
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'branch_name', direction: 'asc' })
  const companyId = searchParams.get('company_id') || undefined
  let scopedCompanyIds = await fetchScopedCompanyIds(supabase, tenantContext.tenantId)

  if (companyId) {
    const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
    if (!companyScope) return NextResponse.json({ error: 'Bagli sirket bulunamadi.', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    scopedCompanyIds = scopedCompanyIds.filter(id => id === companyId)
  }
  if (!scopedCompanyIds.length) {
    return NextResponse.json({
      data: [],
      meta: listMeta(listQuery, 0),
      projection: projectionMeta(branchListProjection, branchListProjection.fallback?.tableName || branchListProjection.sourceName),
    })
  }

  try {
    const projection = await listProjectionRecordsV2({
      supabase,
      request,
      projectionKey: 'branchList',
      permissionKey: [BRANCH_PERMISSIONS.view, 'companies.view'],
      tenantContext,
      listQuery,
      companyId,
      scopedCompanyIds,
    })
    if (!projection.ok) {
      return NextResponse.json({ error: projection.error, code: projection.code }, { status: projection.status || 500 })
    }

    return NextResponse.json({
      data: projection.data || [],
      meta: projection.meta || listMeta(listQuery, 0),
      projection: projection.projection,
      ...(projection.warning ? { warning: projection.warning } : {}),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, code: error.code || 'BRANCHES_FETCH_FAILED' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const moduleGuard = await requireModuleAvailable(request, 'branches')
  if (moduleGuard) return moduleGuard

  return NextResponse.json({
    error: 'Sube serbest kayit olarak olusturulamaz. Sube Acilisi resmi islem wizardini kullanin.',
    code: 'USE_BRANCH_OPENING_WIZARD',
    message: 'Islem tamamlanamadi',
  }, { status: 409 })
}
