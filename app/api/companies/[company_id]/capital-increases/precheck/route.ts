import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildCapitalIncreasePrecheck, ensureCapitalIncreaseAccess } from '../_shared'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  const supabase = createServiceClient()
  const access = await ensureCapitalIncreaseAccess(request, supabase, companyId, 'companies.view')
  if (access.response) return access.response

  try {
    const precheck = await buildCapitalIncreasePrecheck(supabase, companyId, access.tenantContext)
    return NextResponse.json({ data: precheck }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Sermaye artırımı ön kontrolü yapılamadı',
      code: 'CAPITAL_INCREASE_PRECHECK_FAILED',
    }, { status: 500 })
  }
}
