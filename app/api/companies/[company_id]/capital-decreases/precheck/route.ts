import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildCapitalDecreasePrecheck, capitalDecreaseError, ensureCapitalDecreaseAccess } from '../_shared'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  const supabase = createServiceClient()
  const access = await ensureCapitalDecreaseAccess(request, supabase, companyId, 'companies.view')
  if (access.response) return access.response

  try {
    const precheck = await buildCapitalDecreasePrecheck(supabase, companyId, access.tenantContext)
    return NextResponse.json({ data: precheck })
  } catch (error: any) {
    return capitalDecreaseError(error?.message || 'Sermaye azaltımı ön kontrolü yapılamadı.', error?.code || 'CAPITAL_DECREASE_PRECHECK_FAILED', 500)
  }
}
