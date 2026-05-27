// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: company
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/official-changes/activity-subject-change/precheck
// NOTES: Contains official change precheck logic; move to Python Company Domain Service.

import { NextRequest, NextResponse } from 'next/server'
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
