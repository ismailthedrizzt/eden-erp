import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankTransactionsView)
  if (permission instanceof NextResponse) return permission

  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'movement_date', direction: 'desc' })
  const { from, to } = listRange(listQuery)
  const matchStatus = searchParams.get('match_status')
  const companyId = searchParams.get('company_id')

  const result = await fetchFinancialInstitutionMovements(supabase, { matchStatus, companyId, listQuery, from, to })
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })

  return NextResponse.json({
    data: (result.data || []).map((row: any) => ({
      id: row.id,
      source_type: row.source_type === 'card' ? 'card' : 'bank',
      connection_id: row.bank_connection_id,
      provider_code: row.source,
      external_transaction_id: row.external_transaction_id,
      transaction_date: row.movement_date,
      description: row.description,
      counterparty_name: row.counterparty_name,
      merchant_name: row.source_type === 'card' ? row.counterparty_name : null,
      direction: row.direction,
      amount: row.amount,
      currency: row.currency,
      match_status: row.match_status,
      linked_movement_id: row.matched_pre_accounting_movement_id,
    })),
    meta: listMeta(listQuery, result.count ?? 0),
  })
}

function fetchFinancialInstitutionMovements(supabase: ReturnType<typeof createServiceClient>, filters: { matchStatus: string | null; companyId: string | null; listQuery: ReturnType<typeof parseListQuery>; from: number; to: number }) {
  let query = supabase
    .from('financial_institution_movements')
    .select('id,bank_connection_id,company_id,source_type,source,external_transaction_id,movement_date,description,counterparty_name,direction,amount,currency,match_status,matched_pre_accounting_movement_id', { count: 'exact' })
    .eq('is_deleted', false)
    .in('source_type', ['bank_account', 'card'])

  if (filters.matchStatus) query = query.eq('match_status', filters.matchStatus)
  if (filters.companyId) query = query.eq('company_id', filters.companyId)
  if (filters.listQuery.search) query = query.or(`description.ilike.%${filters.listQuery.search}%,counterparty_name.ilike.%${filters.listQuery.search}%`)
  return query.order('movement_date', { ascending: filters.listQuery.direction !== 'desc' }).range(filters.from, filters.to)
}
