import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

const COMPANY_NACE_SELECT = 'id,company_id,nace_code_id,is_primary,status,start_date,end_date,notes,is_deleted,created_at,updated_at,version,nace_code:nace_codes(id,nace_code,description,hazard_class,source_name,source_url,source_reference,valid_from,valid_to,is_active,last_checked_at)'

export async function POST(request: NextRequest, { params }: { params: Promise<{ company_id: string; id: string }> }) {
  const { company_id, id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'company_nace.passivate')
  if (permission instanceof NextResponse) return permission

  const { data: row } = await supabase.from('company_nace_codes').select('id,is_primary').eq('id', id).eq('company_id', company_id).single()
  if (row?.is_primary) {
    const { count } = await supabase
      .from('company_nace_codes')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('status', 'active')
      .eq('is_deleted', false)
    if ((count || 0) > 1) {
      return NextResponse.json({ error: 'Birincil NACE pasifleştirilecekse önce başka bir aktif NACE kodu birincil yapılmalıdır.', code: 'PRIMARY_NACE_REQUIRED' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('company_nace_codes')
    .update({ status: 'passive', is_deleted: true, is_primary: false, deleted_at: new Date().toISOString(), deleted_by: permission.userId })
    .eq('id', id)
    .eq('company_id', company_id)
    .select(COMPANY_NACE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
