import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ company_id: string; id: string }> }) {
  const { company_id, id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'company_nace.edit')
  if (permission instanceof NextResponse) return permission
  const body = await request.json()

  const { data, error } = await supabase
    .from('company_nace_codes')
    .update({ notes: body.notes || null, updated_by: permission.userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', company_id)
    .select('*,nace_code:nace_codes(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
