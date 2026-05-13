import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { parseCompositeId } from '../../_shared'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankAccountsPassivate)
  if (permission instanceof NextResponse) return permission

  try {
    const { kind, rawId } = parseCompositeId(id)
    const table = kind === 'account' ? 'bank_accounts' : 'bank_cards'
    const { data, error } = await supabase
      .from(table)
      .update({ status: 'passive', is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: permission.userId, updated_at: new Date().toISOString(), updated_by: permission.userId })
      .eq('id', rawId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kayıt pasifleştirilemedi.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
