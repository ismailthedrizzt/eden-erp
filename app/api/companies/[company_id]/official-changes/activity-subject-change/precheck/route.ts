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
