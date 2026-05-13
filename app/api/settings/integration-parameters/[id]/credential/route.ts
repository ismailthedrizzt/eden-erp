import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'bank_credentials.edit')
  if (permission instanceof NextResponse) return permission

  await request.json().catch(() => ({}))
  const { data, error } = await supabase
    .from('integration_parameters')
    .update({
      credential_status: 'configured',
      updated_at: new Date().toISOString(),
      updated_by: permission.userId,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, message: 'Credential güvenli saklama alanına yönlendirilmek üzere işaretlendi. Gizli değerler tabloda tutulmadı.' })
}
