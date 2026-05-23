import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  COMPANY_NACE_SELECT,
  requireCompanyNaceAccess,
  scopeCompanyNaceQuery,
  syncPrimaryRiskClass,
} from '../../_shared'

export async function POST(request: NextRequest, { params }: { params: Promise<{ company_id: string; id: string }> }) {
  const { company_id, id } = await params
  const supabase = createServiceClient()
  const access = await requireCompanyNaceAccess(request, supabase, company_id, 'edit')
  if (access instanceof NextResponse) return access

  let clearPrimaryQuery = supabase
    .from('company_nace_codes')
    .update({ is_primary: false, updated_by: access.userId, updated_at: new Date().toISOString() })
    .eq('company_id', company_id)
    .eq('is_deleted', false)
  clearPrimaryQuery = scopeCompanyNaceQuery(clearPrimaryQuery, access.tenantContext)
  await clearPrimaryQuery

  let query = supabase
    .from('company_nace_codes')
    .update({ is_primary: true, status: 'active', updated_by: access.userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', company_id)

  query = scopeCompanyNaceQuery(query, access.tenantContext)

  const { data, error } = await query
    .select(COMPANY_NACE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const naceCode = data.nace_code as Record<string, any> | null
  const syncError = await syncPrimaryRiskClass(supabase, company_id, naceCode, access.tenantContext)
  if (syncError) return NextResponse.json({ error: syncError.message, code: syncError.code || 'PUBLIC_SGK_SYNC_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}
