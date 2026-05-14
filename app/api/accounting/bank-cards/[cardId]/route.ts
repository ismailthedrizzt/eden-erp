import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { normalizeCardPayload } from '../../_banking'
import { BANK_CARD_SELECT } from '../../bank-accounts-cards/_shared'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankCardsEdit)
  if (permission instanceof NextResponse) return permission

  const payload = normalizeCardPayload(await request.json())
  const { data, error } = await supabase.from('bank_cards').update({ ...payload, updated_at: new Date().toISOString(), updated_by: permission.userId }).eq('id', cardId).select(BANK_CARD_SELECT).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
