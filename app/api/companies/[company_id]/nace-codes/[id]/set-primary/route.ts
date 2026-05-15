import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

const COMPANY_NACE_SELECT = 'id,company_id,nace_code_id,is_primary,status,start_date,end_date,notes,is_deleted,created_at,updated_at,version,nace_code:nace_codes(id,nace_code,description,hazard_class,source_name,source_url,source_reference,valid_from,valid_to,is_active,last_checked_at)'

export async function POST(request: NextRequest, { params }: { params: Promise<{ company_id: string; id: string }> }) {
  const { company_id, id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'company_nace.set_primary')
  if (permission instanceof NextResponse) return permission

  await supabase.from('company_nace_codes').update({ is_primary: false }).eq('company_id', company_id).eq('is_deleted', false)
  const { data, error } = await supabase
    .from('company_nace_codes')
    .update({ is_primary: true, status: 'active', updated_by: permission.userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', company_id)
    .select(COMPANY_NACE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const naceCode = data.nace_code as Record<string, any> | null
  await supabase.from('company_public_sgk').upsert({
    company_id,
    nace_code: naceCode?.nace_code || null,
    risk_class: naceCode?.hazard_class || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' })
  return NextResponse.json({ data })
}
