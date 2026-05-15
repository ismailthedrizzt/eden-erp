import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'

const SettingsSchema = z.object({
  company_id: z.string().uuid().optional().nullable(),
  entity_kind: z.enum(['person', 'organization']),
  person_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  account_code: z.string().optional(),
  default_currency: z.string().default('TRY'),
  payment_term_days: z.coerce.number().int().min(0).default(0),
  collection_term_days: z.coerce.number().int().min(0).default(0),
  risk_limit: z.coerce.number().min(0).default(0),
  credit_limit: z.coerce.number().min(0).default(0),
  status: z.string().default('active'),
  notes: z.string().optional(),
})

const ACCOUNT_CARD_VIEW_SELECT = [
  'company_id',
  'entity_kind',
  'person_id',
  'organization_id',
  'display_name',
  'identity_no',
  'tax_no',
  'roles',
  'account_code',
  'official_balance',
  'pending_balance',
  'projected_balance',
  'currency',
  'last_movement_date',
  'risk_status',
  'status',
].join(',')

const ACCOUNT_CARD_SETTINGS_SELECT = [
  'id',
  'company_id',
  'entity_kind',
  'person_id',
  'organization_id',
  'account_code',
  'default_currency',
  'payment_term_days',
  'collection_term_days',
  'risk_limit',
  'credit_limit',
  'status',
  'notes',
  'created_at',
  'updated_at',
  'version',
].join(',')

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'display_name', direction: 'asc' })
  const { from, to } = listRange(listQuery)
  const sortMap: Record<string, string> = { display_name: 'display_name', account_code: 'account_code', official_balance: 'official_balance', last_movement_date: 'last_movement_date', status: 'status' }
  const search = searchParams.get('search') || listQuery.search
  const companyId = searchParams.get('company_id')

  let query = supabase
    .from('v_account_cards')
    .select(ACCOUNT_CARD_VIEW_SELECT, { count: 'exact' })
    .order(sortMap[listQuery.sort || ''] || 'display_name', { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  if (companyId) query = query.eq('company_id', companyId)
  if (search) query = query.or(`display_name.ilike.%${search}%,identity_no.ilike.%${search}%,tax_no.ilike.%${search}%,account_code.ilike.%${search}%`)

  const { data, error, count } = await query
  if (error) {
    if (error.message.includes('v_account_cards')) return NextResponse.json({ data: [], warning: 'Muhasebe migration uygulanmalı.' })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [], meta: listMeta(listQuery, count ?? 0) })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const parsed = SettingsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Geçersiz cari finans ayarı', details: parsed.error.flatten() }, { status: 400 })

  const row = parsed.data
  if (row.entity_kind === 'person' && !row.person_id) return NextResponse.json({ error: 'Kişi master kaydı zorunludur.' }, { status: 400 })
  if (row.entity_kind === 'organization' && !row.organization_id) return NextResponse.json({ error: 'Kurum master kaydı zorunludur.' }, { status: 400 })

  const { data, error } = await saveAccountCardSettings(supabase, row)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

async function saveAccountCardSettings(
  supabase: ReturnType<typeof createServiceClient>,
  row: z.infer<typeof SettingsSchema>
) {
  const identityColumn = row.entity_kind === 'person' ? 'person_id' : 'organization_id'
  const identityValue = row.entity_kind === 'person' ? row.person_id : row.organization_id

  let existingQuery = supabase
    .from('account_card_settings')
    .select('id')
    .eq('entity_kind', row.entity_kind)
    .eq(identityColumn, identityValue)
    .eq('is_deleted', false)
    .limit(1)

  existingQuery = row.company_id ? existingQuery.eq('company_id', row.company_id) : existingQuery.is('company_id', null)
  const { data: existing, error: lookupError } = await existingQuery.maybeSingle()
  if (lookupError) return { data: null, error: lookupError }

  if (existing?.id) {
    return supabase
      .from('account_card_settings')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select(ACCOUNT_CARD_SETTINGS_SELECT)
      .single()
  }

  return supabase
    .from('account_card_settings')
    .insert(row)
    .select(ACCOUNT_CARD_SETTINGS_SELECT)
    .single()
}
