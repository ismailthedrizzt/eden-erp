import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function POST(request: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankConnectionsSync)
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase.from('bank_accounts').update({ last_sync_at: new Date().toISOString() }).eq('id', accountId).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
