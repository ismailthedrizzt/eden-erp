import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankTransactionsView)
  if (permission instanceof NextResponse) return permission

  const { searchParams } = new URL(request.url)
  const matchStatus = searchParams.get('match_status')
  const companyId = searchParams.get('company_id')

  const [bankResult, cardResult] = await Promise.all([
    fetchBankTransactions(supabase, { matchStatus, companyId }),
    fetchCardTransactions(supabase, { matchStatus, companyId }),
  ])

  if (bankResult.error) return NextResponse.json({ error: bankResult.error.message }, { status: 500 })
  if (cardResult.error) return NextResponse.json({ error: cardResult.error.message }, { status: 500 })

  const bankRows = (bankResult.data || []).map((row: any) => ({
    ...row,
    source_type: 'bank',
    merchant_name: null,
  }))
  const cardRows = (cardResult.data || []).map((row: any) => ({
    ...row,
    source_type: 'card',
    counterparty_name: row.merchant_name,
  }))

  return NextResponse.json({
    data: [...bankRows, ...cardRows].sort((a, b) => String(b.transaction_date).localeCompare(String(a.transaction_date))),
  })
}

function fetchBankTransactions(supabase: ReturnType<typeof createServiceClient>, filters: { matchStatus: string | null; companyId: string | null }) {
  let query = supabase
    .from('accounting_bank_transactions')
    .select('id,connection_id,company_id,provider_code,external_transaction_id,transaction_date,description,counterparty_name,direction,amount,currency,match_status,linked_movement_id')
    .eq('is_deleted', false)

  if (filters.matchStatus) query = query.eq('match_status', filters.matchStatus)
  if (filters.companyId) query = query.eq('company_id', filters.companyId)
  return query.order('transaction_date', { ascending: false })
}

function fetchCardTransactions(supabase: ReturnType<typeof createServiceClient>, filters: { matchStatus: string | null; companyId: string | null }) {
  let query = supabase
    .from('accounting_card_transactions')
    .select('id,connection_id,company_id,provider_code,external_transaction_id,transaction_date,description,merchant_name,direction,amount,currency,match_status,linked_movement_id')
    .eq('is_deleted', false)

  if (filters.matchStatus) query = query.eq('match_status', filters.matchStatus)
  if (filters.companyId) query = query.eq('company_id', filters.companyId)
  return query.order('transaction_date', { ascending: false })
}
