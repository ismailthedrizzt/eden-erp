// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: branches
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/branch-openings/precheck
// NOTES: Proxies to FastAPI when FASTAPI_BASE_URL is configured; TS fallback is temporary migration bridge.

import { NextRequest, NextResponse } from 'next/server'
import { isFastApiEnabled, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { buildBranchOpeningPrecheck, ensureOfficialChangeAccess } from '../../_shared'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  if (isFastApiEnabled()) {
    const proxied = await proxyToFastApi(request, `/api/v1/companies/${companyId}/branch-openings/precheck`)
    if (proxied) return proxied
  }
  console.warn('FastAPI backend not configured; using legacy TS fallback for branch opening precheck.')

  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, 'companies.view')
  if (access.response) return access.response

  try {
    const precheck = await buildBranchOpeningPrecheck(supabase, companyId, access.tenantContext, {
      branchName: request.nextUrl.searchParams.get('branch_name'),
      address: request.nextUrl.searchParams.get('address'),
    })
    return NextResponse.json({ data: precheck }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Şube açılışı ön kontrolü yapılamadı.',
      code: error?.code || 'BRANCH_OPENING_PRECHECK_FAILED',
      message: 'İşlem tamamlanamadı',
    }, { status: 500 })
  }
}
