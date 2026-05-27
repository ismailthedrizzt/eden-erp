// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: company
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/official-changes/activity-subject-change/precheck
// NOTES: Proxies to FastAPI when configured; legacy TS fallback is temporary migration bridge.

import { NextRequest, NextResponse } from 'next/server'
import { isFastApiEnabled, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buildActivitySubjectChangePrecheck,
  ensureOfficialChangeAccess,
} from '../../_shared'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  if (isFastApiEnabled()) {
    const proxied = await proxyToFastApi(request, `/api/v1/companies/${companyId}/official-changes/activity-subject-change/precheck`)
    if (proxied) return proxied
  }
  console.warn('FastAPI backend not configured; using legacy TS fallback for activity subject precheck.')

  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, 'companies.view')
  if (access.response) return access.response

  try {
    const data = await buildActivitySubjectChangePrecheck(supabase, companyId, access.tenantContext)
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Faaliyet konusu değişikliği ön kontrolü yapılamadı.',
      code: error?.code || 'ACTIVITY_SUBJECT_CHANGE_PRECHECK_FAILED',
      message: 'İşlem tamamlanamadı',
    }, { status: 500 })
  }
}
