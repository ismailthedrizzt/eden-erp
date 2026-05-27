// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: company
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/official-changes/address-change/precheck
// NOTES: Proxies to FastAPI when configured; legacy TS fallback is temporary migration bridge.

import { NextRequest, NextResponse } from 'next/server'
import { isFastApiEnabled, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { buildOfficialChangePrecheck, ensureOfficialChangeAccess } from '../../_shared'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  if (isFastApiEnabled()) {
    const proxied = await proxyToFastApi(request, `/api/v1/companies/${companyId}/official-changes/address-change/precheck`)
    if (proxied) return proxied
  }
  console.warn('FastAPI backend not configured; using legacy TS fallback for address change precheck.')

  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, 'companies.view')
  if (access.response) return access.response

  try {
    const precheck = await buildOfficialChangePrecheck(supabase, companyId, access.tenantContext, 'address_change')
    return NextResponse.json({ data: precheck }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Adres değişikliği ön kontrolü yapılamadı.',
      code: error?.code || 'ADDRESS_CHANGE_PRECHECK_FAILED',
      message: 'İşlem tamamlanamadı',
    }, { status: 500 })
  }
}
