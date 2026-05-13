import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankConnectionsTest)
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase
    .from('bank_connections')
    .update({ connection_status: 'connected', last_test_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: permission.userId })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, message: 'Bağlantı testi tamamlandı. Credential detayları frontend tarafına gönderilmedi.' })
}
