import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { cleanPayload, enrichConnections, isMissingTableError, missingTableResponse, normalizeConnectionPayload } from '../../_banking'
import { BANK_ACCOUNT_SELECT, BANK_CARD_SELECT, BANK_CONNECTION_SELECT } from '../../bank-accounts-cards/_shared'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankConnectionsView)
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase.from('bank_connections').select(BANK_CONNECTION_SELECT).eq('id', id).eq('is_deleted', false).single()
  if (error) {
    if (isMissingTableError(error)) return missingTableResponse('bank_connections')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const [connections, accounts, cards] = await Promise.all([
    enrichConnections(supabase as any, [data]),
    supabase.from('bank_accounts').select(BANK_ACCOUNT_SELECT).eq('bank_connection_id', id).eq('is_deleted', false).order('created_at', { ascending: false }),
    supabase.from('bank_cards').select(BANK_CARD_SELECT).eq('bank_connection_id', id).eq('is_deleted', false).order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    data: {
      ...connections[0],
      accounts: accounts.data || [],
      cards: cards.data || [],
    },
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankConnectionsEdit)
  if (permission instanceof NextResponse) return permission

  const payload = normalizeConnectionPayload(await request.json())
  const { data, error } = await supabase
    .from('bank_connections')
    .update(cleanPayload({ ...payload, updated_by: permission.userId, updated_at: new Date().toISOString() }))
    .eq('id', id)
    .select(BANK_CONNECTION_SELECT)
    .single()

  if (error) {
    if (isMissingTableError(error)) return missingTableResponse('bank_connections')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
