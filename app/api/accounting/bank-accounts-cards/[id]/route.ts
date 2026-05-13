import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { ensureManualBankConnection, normalizeAccountBody, normalizeCardBody, parseCompositeId } from '../_shared'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankAccountsView)
  if (permission instanceof NextResponse) return permission

  try {
    const { kind, rawId } = parseCompositeId(id)
    const table = kind === 'account' ? 'bank_accounts' : 'bank_cards'
    const { data, error } = await supabase.from(table).select('*').eq('id', rawId).eq('is_deleted', false).single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data: { ...data, id, raw_id: rawId, record_type: kind } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kayıt bulunamadı.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankAccountsEdit)
  if (permission instanceof NextResponse) return permission

  try {
    const body = await request.json()
    const { kind, rawId } = parseCompositeId(id)
    const connection = await ensureManualBankConnection(supabase as any, body, permission.userId)

    if (kind === 'account') {
      const payload = normalizeAccountBody(body, connection, permission.userId)
      const { data, error } = await supabase.from('bank_accounts').update(payload).eq('id', rawId).select('*').single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ data: { ...data, id } })
    }

    const payload = normalizeCardBody(body, connection, permission.userId)
    const { data, error } = await supabase.from('bank_cards').update(payload).eq('id', rawId).select('*').single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data: { ...data, id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kayıt güncellenemedi.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
