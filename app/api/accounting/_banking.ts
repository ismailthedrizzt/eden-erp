import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export function isMissingTableError(error: any) {
  const message = String(error?.message || '')
  return error?.code === '42P01' || message.includes('Could not find the table') || message.includes('does not exist')
}

export function missingTableResponse(table: string) {
  return NextResponse.json({ data: [], warning: `${table} tablosu bulunamadı. İlgili migration uygulanmalı.` })
}

export function cleanPayload(payload: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  )
}

export async function fetchCompanyNames(supabase: SupabaseClient, companyIds: Array<string | null | undefined>) {
  const ids = Array.from(new Set(companyIds.filter(Boolean))) as string[]
  if (!ids.length) return new Map<string, string>()

  const { data } = await supabase
    .from('sirketler')
    .select('id,kisa_unvan,ticari_unvan')
    .in('id', ids)

  return new Map((data || []).map((row: any) => [row.id, row.kisa_unvan || row.ticari_unvan || 'Şirket']))
}

export async function enrichConnections(supabase: SupabaseClient, connections: any[]) {
  const companyNames = await fetchCompanyNames(supabase, connections.map(row => row.company_id))
  const ids = connections.map(row => row.id)

  const [accounts, cards] = await Promise.all([
    ids.length
      ? supabase.from('bank_accounts').select('bank_connection_id').in('bank_connection_id', ids).eq('is_deleted', false)
      : Promise.resolve({ data: [] as any[], error: null }),
    ids.length
      ? supabase.from('bank_cards').select('bank_connection_id').in('bank_connection_id', ids).eq('is_deleted', false)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const accountCounts = countBy(accounts.data || [], 'bank_connection_id')
  const cardCounts = countBy(cards.data || [], 'bank_connection_id')

  return connections.map(row => ({
    ...row,
    company_name: row.company_id ? companyNames.get(row.company_id) || null : null,
    account_count: accountCounts.get(row.id) || 0,
    card_count: cardCounts.get(row.id) || 0,
  }))
}

export function countBy(rows: any[], key: string) {
  const map = new Map<string, number>()
  rows.forEach(row => {
    const value = row[key]
    if (value) map.set(value, (map.get(value) || 0) + 1)
  })
  return map
}

export function normalizeConnectionPayload(body: Record<string, any>) {
  return cleanPayload({
    company_id: body.company_id || null,
    bank_name: body.bank_name,
    provider_code: body.provider_code || 'manual',
    integration_type: body.integration_type || 'manual',
    connection_status: body.connection_status || 'not_connected',
    credential_id: body.credential_id || null,
    environment: body.environment || 'sandbox',
    base_url: body.base_url || null,
    status: body.status || 'active',
    notes: body.notes || null,
  })
}

export function normalizeAccountPayload(body: Record<string, any>, connection?: Record<string, any>) {
  return cleanPayload({
    company_id: body.company_id || connection?.company_id || null,
    bank_connection_id: body.bank_connection_id || connection?.id,
    iban: body.iban || null,
    account_no: body.account_no || null,
    account_name: body.account_name,
    branch_name: body.branch_name || null,
    branch_code: body.branch_code || null,
    currency: body.currency || 'TRY',
    account_type: body.account_type || 'vadesiz',
    opening_date: body.opening_date || null,
    is_default: !!body.is_default,
    last_balance: body.last_balance === '' || body.last_balance === undefined ? null : Number(body.last_balance),
    status: body.status || 'active',
  })
}

export function normalizeCardPayload(body: Record<string, any>, connection?: Record<string, any>) {
  return cleanPayload({
    company_id: body.company_id || connection?.company_id || null,
    bank_connection_id: body.bank_connection_id || connection?.id,
    card_name: body.card_name,
    card_type: body.card_type || 'credit_card',
    last_four_digits: body.last_four_digits || null,
    currency: body.currency || 'TRY',
    limit_amount: body.limit_amount === '' || body.limit_amount === undefined ? null : Number(body.limit_amount),
    available_limit: body.available_limit === '' || body.available_limit === undefined ? null : Number(body.available_limit),
    statement_day: body.statement_day === '' || body.statement_day === undefined ? null : Number(body.statement_day),
    payment_due_day: body.payment_due_day === '' || body.payment_due_day === undefined ? null : Number(body.payment_due_day),
    is_default: !!body.is_default,
    status: body.status || 'active',
  })
}

export function normalizeMovementPayload(body: Record<string, any>) {
  return cleanPayload({
    company_id: body.company_id || null,
    bank_connection_id: body.bank_connection_id || null,
    bank_account_id: body.bank_account_id || null,
    bank_card_id: body.bank_card_id || null,
    source_type: body.source_type || (body.bank_card_id ? 'card' : body.bank_account_id ? 'bank_account' : 'manual'),
    movement_type: body.movement_type || null,
    movement_date: body.movement_date,
    value_date: body.value_date || null,
    description: body.description || null,
    counterparty_name: body.counterparty_name || null,
    counterparty_iban: body.counterparty_iban || null,
    reference_no: body.reference_no || null,
    amount: Number(body.amount || 0),
    currency: body.currency || 'TRY',
    direction: body.direction || 'debit',
    source: body.source || 'manual',
    external_transaction_id: body.external_transaction_id || null,
    raw_data: body.raw_data || {},
    match_status: body.match_status || 'waiting',
    status: body.status || 'active',
  })
}
