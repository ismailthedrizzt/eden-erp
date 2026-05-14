import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { normalizeAccountPayload } from '../../_banking'
import { BANK_ACCOUNT_SELECT } from '../../bank-accounts-cards/_shared'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankAccountsEdit)
  if (permission instanceof NextResponse) return permission

  const payload = normalizeAccountPayload(await request.json())
  const { data, error } = await supabase.from('bank_accounts').update({ ...payload, updated_at: new Date().toISOString(), updated_by: permission.userId }).eq('id', accountId).select(BANK_ACCOUNT_SELECT).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
