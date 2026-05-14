import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { fetchCompanyNames, isMissingTableError, missingTableResponse } from '../_banking'

const MOVEMENT_LIST_COLUMNS = [
  'id',
  'company_id',
  'bank_connection_id',
  'bank_account_id',
  'bank_card_id',
  'source_type',
  'movement_type',
  'movement_date',
  'value_date',
  'description',
  'counterparty_name',
  'counterparty_iban',
  'reference_no',
  'amount',
  'currency',
  'direction',
  'source',
  'raw_data',
  'match_status',
  'matched_pre_accounting_movement_id',
  'matched_at',
  'matched_by',
  'status',
].join(',')

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankMovementsView)
  if (permission instanceof NextResponse) return permission

  const { searchParams } = new URL(request.url)
  let query = supabase
    .from('financial_institution_movements')
    .select(MOVEMENT_LIST_COLUMNS)
    .eq('is_deleted', false)
    .order('movement_date', { ascending: false })

  const filterMap: Array<[string, string]> = [
    ['bankConnectionId', 'bank_connection_id'],
    ['accountId', 'bank_account_id'],
    ['cardId', 'bank_card_id'],
    ['companyId', 'company_id'],
    ['matchStatus', 'match_status'],
    ['movementType', 'movement_type'],
    ['sourceType', 'source_type'],
    ['direction', 'direction'],
  ]

  filterMap.forEach(([param, column]) => {
    const value = searchParams.get(param)
    if (value) query = query.eq(column, value)
  })

  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  if (dateFrom) query = query.gte('movement_date', dateFrom)
  if (dateTo) query = query.lte('movement_date', dateTo)

  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) return missingTableResponse('financial_institution_movements')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = await enrichMovementRows(supabase as any, data || [])
  return NextResponse.json({ data: rows, summary: summarize(rows) })
}

async function enrichMovementRows(supabase: ReturnType<typeof createServiceClient>, rows: any[]) {
  const companyNames = await fetchCompanyNames(supabase as any, rows.map(row => row.company_id))
  const connectionIds = Array.from(new Set(rows.map(row => row.bank_connection_id).filter(Boolean)))
  const accountIds = Array.from(new Set(rows.map(row => row.bank_account_id).filter(Boolean)))
  const cardIds = Array.from(new Set(rows.map(row => row.bank_card_id).filter(Boolean)))

  const [connections, accounts, cards] = await Promise.all([
    connectionIds.length ? supabase.from('bank_connections').select('id,bank_name').in('id', connectionIds) : Promise.resolve({ data: [] as any[] }),
    accountIds.length ? supabase.from('bank_accounts').select('id,account_name,iban').in('id', accountIds) : Promise.resolve({ data: [] as any[] }),
    cardIds.length ? supabase.from('bank_cards').select('id,card_name,last_four_digits').in('id', cardIds) : Promise.resolve({ data: [] as any[] }),
  ])

  const connectionMap = new Map((connections.data || []).map((row: any) => [row.id, row.bank_name]))
  const accountMap = new Map((accounts.data || []).map((row: any) => [row.id, row.account_name || row.iban]))
  const cardMap = new Map((cards.data || []).map((row: any) => [row.id, row.card_name || `Kart ${row.last_four_digits || ''}`.trim()]))

  return rows.map(row => ({
    ...row,
    company_name: row.company_id ? companyNames.get(row.company_id) || null : null,
    bank_name: row.bank_connection_id ? connectionMap.get(row.bank_connection_id) || null : null,
    account_card_name: row.bank_account_id
      ? accountMap.get(row.bank_account_id) || null
      : row.bank_card_id
        ? cardMap.get(row.bank_card_id) || null
        : 'Manuel',
  }))
}

function summarize(rows: any[]) {
  return {
    total: rows.length,
    unmatched: rows.filter(row => ['waiting', 'not_found', 'suggested'].includes(row.match_status)).length,
    matched: rows.filter(row => ['matched', 'manual_match'].includes(row.match_status)).length,
    reviewRequired: rows.filter(row => row.match_status === 'review_required').length,
    totalCredit: rows.filter(row => row.direction === 'credit').reduce((sum, row) => sum + Number(row.amount || 0), 0),
    totalDebit: rows.filter(row => row.direction === 'debit').reduce((sum, row) => sum + Number(row.amount || 0), 0),
  }
}
