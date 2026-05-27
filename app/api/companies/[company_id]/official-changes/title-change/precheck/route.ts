// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: company
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/official-changes/title-change/precheck
// NOTES: Contains title change precheck logic; move to Python Company Domain Service.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildOfficialChangePrecheck, ensureOfficialChangeAccess } from '../../_shared'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, 'companies.view')
  if (access.response) return access.response

  try {
    const precheck = await buildOfficialChangePrecheck(supabase, companyId, access.tenantContext, 'title_change')
    return NextResponse.json({ data: precheck }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Unvan değişikliği ön kontrolü yapılamadı.',
      code: error?.code || 'TITLE_CHANGE_PRECHECK_FAILED',
      message: 'İşlem tamamlanamadı',
    }, { status: 500 })
  }
}
