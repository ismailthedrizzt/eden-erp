import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

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
    .select('*,nace_code:nace_codes(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.from('company_public_sgk').upsert({
    company_id,
    nace_code: data.nace_code?.nace_code || null,
    risk_class: data.nace_code?.hazard_class || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' })
  return NextResponse.json({ data })
}
