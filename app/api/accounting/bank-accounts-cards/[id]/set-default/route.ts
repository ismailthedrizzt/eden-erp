import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { parseCompositeId } from '../../_shared'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankAccountsEdit)
  if (permission instanceof NextResponse) return permission

  try {
    const { kind, rawId } = parseCompositeId(id)
    const table = kind === 'account' ? 'bank_accounts' : 'bank_cards'
    const { data: current, error: currentError } = await supabase.from(table).select('id,company_id').eq('id', rawId).single()
    if (currentError) throw new Error(currentError.message)

    let reset = supabase.from(table).update({ is_default: false }).eq('is_deleted', false)
    reset = current.company_id ? reset.eq('company_id', current.company_id) : reset.is('company_id', null)
    const { error: resetError } = await reset
    if (resetError) throw new Error(resetError.message)

    const { data, error } = await supabase
      .from(table)
      .update({ is_default: true, updated_at: new Date().toISOString(), updated_by: permission.userId })
      .eq('id', rawId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Varsayılan kayıt belirlenemedi.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
