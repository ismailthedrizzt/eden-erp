import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { listMetaFromRows, listRange, parseListQuery } from '@/lib/api/listEndpoint'

const MovementSchema = z.object({
  company_id: z.string().uuid().optional().nullable(),
  movement_type: z.string().min(1),
  movement_date: z.string().min(1),
  description: z.string().optional(),
  performed_by_person_id: z.string().uuid().optional().nullable(),
  counterparty_kind: z.enum(['person', 'organization']),
  counterparty_person_id: z.string().uuid().optional().nullable(),
  counterparty_organization_id: z.string().uuid().optional().nullable(),
  direction: z.enum(['debit', 'credit']),
  amount: z.coerce.number().min(0.01),
  currency: z.string().default('TRY'),
  exchange_rate: z.coerce.number().min(0.000001).default(1),
  payment_method: z.string().min(1),
  payment_source_type: z.string().optional(),
  payment_source_id: z.string().uuid().optional().nullable(),
  linked_ownership_transaction_id: z.string().uuid().optional().nullable(),
  capital_relation_type: z.string().optional().nullable(),
  offset_amount: z.coerce.number().min(0).optional().nullable(),
  document_status: z.string().default('none'),
  document_reference_id: z.string().uuid().optional().nullable(),
  invoice_match_status: z.string().default('none'),
  bank_match_status: z.string().default('none'),
  reconciliation_status: z.string().default('none'),
  row_health_status: z.string().optional(),
  status: z.string().default('Taslak'),
  workflow_status: z.string().default('none'),
})

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'movement_date', direction: 'desc' })
  const { from, to } = listRange(listQuery)
  const sortMap: Record<string, string> = { movement_date: 'movement_date', amount: 'amount', status: 'status', movement_type: 'movement_type', created_at: 'created_at' }
  const search = searchParams.get('search') || listQuery.search
  const linkedOwnershipTransactionId = searchParams.get('linked_ownership_transaction_id')
  const companyId = searchParams.get('company_id')

  let query = supabase
    .from('account_movements')
    .select(`
      *,
      performed_by:persons!account_movements_performed_by_person_id_fkey(id,full_name),
      counterparty_person:persons!account_movements_counterparty_person_id_fkey(id,full_name),
      counterparty_organization:organizations!account_movements_counterparty_organization_id_fkey(id,legal_name)
    `)
    .eq('is_deleted', false)
    .order(sortMap[listQuery.sort || ''] || 'movement_date', { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  if (search) query = query.ilike('description', `%${search}%`)
  if (companyId) query = query.eq('company_id', companyId)
  if (linkedOwnershipTransactionId) query = query.eq('linked_ownership_transaction_id', linkedOwnershipTransactionId)

  const { data, error } = await query
  if (error) {
    if (error.message.includes('account_movements')) return NextResponse.json({ data: [], warning: 'Muhasebe modulu kurulumu tamamlanmali.' })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: (data || []).map((row: any) => ({
      ...row,
      performed_by_name: row.performed_by?.full_name || null,
      counterparty_name: row.counterparty_person?.full_name || row.counterparty_organization?.legal_name || null,
      partner_name: row.counterparty_person?.full_name || row.counterparty_organization?.legal_name || null,
    })),
    meta: listMetaFromRows(listQuery, data?.length ?? 0),
  })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const parsed = MovementSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Geçersiz ön muhasebe hareketi', details: parsed.error.flatten() }, { status: 400 })

  const movement = {
    ...parsed.data,
    row_health_status: parsed.data.row_health_status || calculateRowHealth(parsed.data),
  }

  if (movement.counterparty_kind === 'person' && !movement.counterparty_person_id) return NextResponse.json({ error: 'Karşı taraf kişi master kaydı zorunludur.' }, { status: 400 })
  if (movement.counterparty_kind === 'organization' && !movement.counterparty_organization_id) return NextResponse.json({ error: 'Karşı taraf kurum master kaydı zorunludur.' }, { status: 400 })

  await ensureAccountCardSettings(supabase, movement)

  const { data, error } = await supabase
    .from('account_movements')
    .insert(movement)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

function calculateRowHealth(row: z.infer<typeof MovementSchema>) {
  if (row.invoice_match_status === 'rejected') return 'invoice_rejected'
  if (row.invoice_match_status === 'cancelled') return 'invoice_cancelled'
  if (row.bank_match_status === 'matched') return 'auto_matched'
  if (row.bank_match_status === 'manual_match') return 'manual_matched'
  if (row.document_status === 'none' || row.document_status === 'missing') return 'missing_document'
  if (row.bank_match_status === 'not_found') return 'missing_bank_match'
  return 'manual_review_required'
}

async function ensureAccountCardSettings(supabase: ReturnType<typeof createServiceClient>, row: z.infer<typeof MovementSchema>) {
  const settings = {
    company_id: row.company_id || null,
    entity_kind: row.counterparty_kind,
    person_id: row.counterparty_kind === 'person' ? row.counterparty_person_id : null,
    organization_id: row.counterparty_kind === 'organization' ? row.counterparty_organization_id : null,
    default_currency: row.currency,
    status: 'active',
  }

  const identityColumn = row.counterparty_kind === 'person' ? 'person_id' : 'organization_id'
  const identityValue = row.counterparty_kind === 'person' ? row.counterparty_person_id : row.counterparty_organization_id

  let existingQuery = supabase
    .from('account_card_settings')
    .select('id')
    .eq('entity_kind', row.counterparty_kind)
    .eq(identityColumn, identityValue)
    .eq('is_deleted', false)
    .limit(1)

  existingQuery = row.company_id ? existingQuery.eq('company_id', row.company_id) : existingQuery.is('company_id', null)
  const { data: existing } = await existingQuery.maybeSingle()
  if (existing?.id) return

  await supabase.from('account_card_settings').insert(settings)
}
