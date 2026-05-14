import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { INTEGRATION_PARAMETER_SELECT } from '../../_shared'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'bank_credentials.test')
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase
    .from('integration_parameters')
    .update({
      connection_status: 'pending_test',
      api_status: 'Test isteği alındı',
      last_test_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: permission.userId,
    })
    .eq('id', id)
    .select(INTEGRATION_PARAMETER_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, message: 'Entegrasyon testi kuyruğa alınmak üzere işaretlendi.' })
}
