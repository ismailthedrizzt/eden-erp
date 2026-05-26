import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buildNaceChangePrecheck,
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
    const data = await buildNaceChangePrecheck(supabase, companyId, access.tenantContext)
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'NACE / faaliyet kodu güncelleme ön kontrolü yapılamadı.',
      code: error?.code || 'NACE_CHANGE_PRECHECK_FAILED',
      message: 'İşlem tamamlanamadı',
    }, { status: 500 })
  }
}
