// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: branches
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/branch-closings/precheck
// NOTES: Proxies to FastAPI when FASTAPI_BASE_URL is configured; TS fallback is temporary migration bridge.

import { NextRequest, NextResponse } from 'next/server'
import { isFastApiEnabled, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { buildBranchClosingPrecheck, ensureOfficialChangeAccess } from '../../_shared'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  if (isFastApiEnabled()) {
    const proxied = await proxyToFastApi(request, `/api/v1/companies/${companyId}/branch-closings/precheck`)
    if (proxied) return proxied
  }
  console.warn('FastAPI backend not configured; using legacy TS fallback for branch closing precheck.')

  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, 'companies.view')
  if (access.response) return access.response

  try {
    const precheck = await buildBranchClosingPrecheck(
      supabase,
      companyId,
      access.tenantContext,
      request.nextUrl.searchParams.get('branch_id')
    )
    return NextResponse.json({ data: precheck }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Şube kapanışı ön kontrolü yapılamadı.',
      code: error?.code || 'BRANCH_CLOSING_PRECHECK_FAILED',
      message: 'İşlem tamamlanamadı',
    }, { status: 500 })
  }
}
