import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveTurkishIban } from '@/lib/utils'
import { cleanPayload, fetchCompanyNames } from '../_banking'
import type { ListQuery } from '@/lib/api/listEndpoint'

export type BankAccountCardKind = 'account' | 'card'

export const BANK_ACCOUNT_SELECT = [
  'id',
  'company_id',
  'bank_connection_id',
  'branch_name',
  'branch_code',
  'iban',
  'account_no',
  'account_name',
  'currency',
  'account_type',
  'opening_date',
  'is_default',
  'last_balance',
  'last_sync_at',
  'status',
  'is_deleted',
  'created_at',
  'updated_at',
  'version',
].join(',')

export const BANK_CARD_SELECT = [
  'id',
  'company_id',
  'bank_connection_id',
  'linked_bank_account_id',
  'branch_name',
  'branch_code',
  'last_four_digits',
  'card_name',
  'currency',
  'card_type',
  'is_default',
  'limit_amount',
  'available_limit',
  'statement_day',
  'payment_due_day',
  'status',
  'is_deleted',
  'created_at',
  'updated_at',
  'version',
].join(',')

export const BANK_CONNECTION_SELECT = [
  'id',
  'company_id',
  'bank_name',
  'provider_code',
  'integration_type',
  'connection_status',
  'credential_id',
  'environment',
  'base_url',
  'last_test_at',
  'last_sync_at',
  'status',
  'notes',
  'is_deleted',
  'created_at',
  'updated_at',
  'version',
].join(',')

export function parseCompositeId(id: string): { kind: BankAccountCardKind; rawId: string } {
  const [kind, rawId] = id.split(':')
  if ((kind === 'account' || kind === 'card') && rawId) return { kind, rawId }
  throw new Error('Geçersiz hesap/kart kimliği.')
}

type BankAccountCardListOptions = {
  includePassive?: boolean
  from?: number
  to?: number
  search?: string
  sort?: string
  direction?: ListQuery['direction']
}

export async function listBankAccountsCards(supabase: SupabaseClient, options: BankAccountCardListOptions = {}) {
  const from = options.from ?? 0
  const to = options.to ?? 49
  const direction = options.direction === 'desc' ? 'desc' : 'asc'
  const sortColumn = getBankAccountCardSortColumn(options.sort)
  let accountsQuery = supabase
    .from('bank_accounts')
    .select(BANK_ACCOUNT_SELECT, { count: 'planned' })
    .order(sortColumn.accounts, { ascending: direction !== 'desc' })
    .range(0, to)
  let cardsQuery = supabase
    .from('bank_cards')
    .select(BANK_CARD_SELECT, { count: 'planned' })
    .order(sortColumn.cards, { ascending: direction !== 'desc' })
    .range(0, to)

  if (!options.includePassive) {
    accountsQuery = accountsQuery.eq('is_deleted', false)
    cardsQuery = cardsQuery.eq('is_deleted', false)
  }

  const search = options.search?.trim()
  if (search) {
    accountsQuery = accountsQuery.or(`account_name.ilike.%${search}%,iban.ilike.%${search}%,account_no.ilike.%${search}%`)
    cardsQuery = cardsQuery.or(`card_name.ilike.%${search}%,last_four_digits.ilike.%${search}%`)
  }

  const [accountsResult, cardsResult] = await Promise.all([
    accountsQuery,
    cardsQuery,
  ])

  if (accountsResult.error) throw new Error(accountsResult.error.message)
  if (cardsResult.error) throw new Error(cardsResult.error.message)

  const rows = [...(accountsResult.data || []), ...(cardsResult.data || [])]
  const connectionIds = Array.from(new Set(rows.map((row: any) => row.bank_connection_id).filter(Boolean)))
  const companyNames = await fetchCompanyNames(supabase as any, rows.map((row: any) => row.company_id))
  const { data: connections } = connectionIds.length
    ? await supabase.from('bank_connections').select('id,bank_name').in('id', connectionIds)
    : { data: [] as any[] }
  const connectionMap = new Map((connections || []).map((row: any) => [row.id, row.bank_name]))

  const accountOptions = (accountsResult.data || []).map((account: any) => ({
    value: account.id,
    label: account.account_name || account.iban || account.account_no || 'Hesap',
    bank_connection_id: account.bank_connection_id,
  }))

  const accounts = (accountsResult.data || []).map((row: any) => ({
    id: `account:${row.id}`,
    raw_id: row.id,
    record_type: 'account',
    record_type_label: 'Hesap',
    company_id: row.company_id,
    company_name: row.company_id ? companyNames.get(row.company_id) || null : null,
    bank_connection_id: row.bank_connection_id,
    bank_name: connectionMap.get(row.bank_connection_id) || '-',
    branch_name: row.branch_name,
    branch_code: row.branch_code,
    branch_display: [row.branch_name, row.branch_code].filter(Boolean).join(' / ') || '-',
    identity_display: row.iban || row.account_no || '-',
    name: row.account_name,
    currency: row.currency,
    type: row.account_type,
    type_label: accountTypeLabel(row.account_type),
    is_default: row.is_default,
    is_default_label: row.is_default ? 'Evet' : 'Hayır',
    balance_limit_display: row.last_balance ?? '-',
    status: row.status,
    raw: row,
  }))

  const cards = (cardsResult.data || []).map((row: any) => ({
    id: `card:${row.id}`,
    raw_id: row.id,
    record_type: 'card',
    record_type_label: 'Kart',
    company_id: row.company_id,
    company_name: row.company_id ? companyNames.get(row.company_id) || null : null,
    bank_connection_id: row.bank_connection_id,
    bank_name: connectionMap.get(row.bank_connection_id) || '-',
    branch_name: row.branch_name,
    branch_code: row.branch_code,
    branch_display: [row.branch_name, row.branch_code].filter(Boolean).join(' / ') || '-',
    identity_display: row.last_four_digits ? `**** ${row.last_four_digits}` : '-',
    name: row.card_name,
    currency: row.currency,
    type: row.card_type,
    type_label: cardTypeLabel(row.card_type),
    linked_bank_account_id: row.linked_bank_account_id,
    is_default: row.is_default,
    is_default_label: row.is_default ? 'Evet' : 'Hayır',
    balance_limit_display: row.limit_amount ? `${row.limit_amount}${row.available_limit ? ` / ${row.available_limit}` : ''}` : '-',
    status: row.status,
    raw: row,
  }))

  return {
    rows: sortBankAccountCardRows([...accounts, ...cards], options.sort, direction).slice(from, to + 1),
    accountOptions,
    total: (accountsResult.count ?? accounts.length) + (cardsResult.count ?? cards.length),
  }
}

function getBankAccountCardSortColumn(sort?: string) {
  const map: Record<string, { accounts: string; cards: string }> = {
    bank_name: { accounts: 'created_at', cards: 'created_at' },
    company_name: { accounts: 'company_id', cards: 'company_id' },
    identity_display: { accounts: 'iban', cards: 'last_four_digits' },
    name: { accounts: 'account_name', cards: 'card_name' },
    currency: { accounts: 'currency', cards: 'currency' },
    type: { accounts: 'account_type', cards: 'card_type' },
    status: { accounts: 'status', cards: 'status' },
    created_at: { accounts: 'created_at', cards: 'created_at' },
    updated_at: { accounts: 'updated_at', cards: 'updated_at' },
  }
  return map[sort || ''] || { accounts: 'created_at', cards: 'created_at' }
}

function sortBankAccountCardRows(rows: any[], sort = 'created_at', direction: ListQuery['direction'] = 'desc') {
  const sorted = [...rows].sort((a, b) => {
    if (sort === 'bank_name') {
      const bankCompare = String(a.bank_name || '').localeCompare(String(b.bank_name || ''), 'tr')
      if (bankCompare !== 0) return bankCompare
    }
    const left = sort === 'created_at' ? a.raw?.created_at : a[sort]
    const right = sort === 'created_at' ? b.raw?.created_at : b[sort]
    return String(left || '').localeCompare(String(right || ''), 'tr')
  })
  if (direction === 'desc') sorted.reverse()
  return sorted
}

export async function ensureManualBankConnection(supabase: SupabaseClient, body: Record<string, any>, userId: string | null) {
  const companyId = body.company_id || null
  const bankName = body.bank_name
  if (!bankName) throw new Error('Banka seçimi zorunludur.')

  const { data: existing, error } = await supabase
    .from('bank_connections')
    .select(BANK_CONNECTION_SELECT)
    .eq('is_deleted', false)
    .eq('bank_name', bankName)
    .eq('provider_code', 'manual')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (existing) return existing

  const { data, error: insertError } = await supabase
    .from('bank_connections')
    .insert({
      company_id: companyId,
      bank_name: bankName,
      provider_code: 'manual',
      integration_type: 'manual',
      connection_status: 'not_connected',
      status: 'active',
      created_by: userId,
      updated_by: userId,
    })
    .select(BANK_CONNECTION_SELECT)
    .single()

  if (insertError) throw new Error(insertError.message)
  return data
}

export function normalizeAccountBody(body: Record<string, any>, connection: Record<string, any>, userId: string | null) {
  const ibanDetails = body.iban ? resolveTurkishIban(body.iban) : null
  return cleanPayload({
    company_id: body.company_id || connection.company_id || null,
    bank_connection_id: connection.id,
    iban: ibanDetails?.iban || body.iban || null,
    account_no: body.account_no || ibanDetails?.accountNo || null,
    account_name: body.account_name,
    branch_name: body.branch_name || ibanDetails?.branchName || null,
    branch_code: body.branch_code || ibanDetails?.branchCode || null,
    currency: body.currency || 'TRY',
    account_type: body.account_type || 'vadesiz',
    opening_date: body.opening_date || null,
    is_default: !!body.is_default,
    status: body.status || 'active',
    updated_at: new Date().toISOString(),
    updated_by: userId,
  })
}

export function normalizeCardBody(body: Record<string, any>, connection: Record<string, any>, userId: string | null) {
  return cleanPayload({
    company_id: body.company_id || connection.company_id || null,
    bank_connection_id: connection.id,
    linked_bank_account_id: body.linked_bank_account_id || null,
    card_name: body.card_name,
    card_type: body.card_type || 'credit_card',
    last_four_digits: body.last_four_digits || null,
    branch_name: body.branch_name || null,
    branch_code: body.branch_code || null,
    currency: body.currency || 'TRY',
    limit_amount: body.limit_amount === '' || body.limit_amount === undefined ? null : Number(body.limit_amount),
    available_limit: body.available_limit === '' || body.available_limit === undefined ? null : Number(body.available_limit),
    statement_day: body.statement_day === '' || body.statement_day === undefined ? null : Number(body.statement_day),
    payment_due_day: body.payment_due_day === '' || body.payment_due_day === undefined ? null : Number(body.payment_due_day),
    is_default: !!body.is_default,
    status: body.status || 'active',
    updated_at: new Date().toISOString(),
    updated_by: userId,
  })
}

export function accountTypeLabel(value?: string | null) {
  return ({
    vadesiz: 'Vadesiz',
    vadeli: 'Vadeli',
    doviz: 'Döviz',
    kredi: 'Kredi',
    pos: 'POS',
    other: 'Diğer',
  } as Record<string, string>)[value || ''] || value || '-'
}

export function cardTypeLabel(value?: string | null) {
  return ({
    credit_card: 'Kredi Kartı',
    debit_card: 'Banka Kartı',
    virtual_card: 'Sanal Kart',
    company_card: 'Şirket Kartı',
    pos_card: 'POS Kartı',
    other: 'Diğer',
  } as Record<string, string>)[value || ''] || value || '-'
}
