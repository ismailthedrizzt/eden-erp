import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

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
    .select('*,nace_code:nace_codes(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
