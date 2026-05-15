import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingTableError } from '../_banking'
import { BANK_ACCOUNT_SELECT, BANK_CARD_SELECT, ensureManualBankConnection, listBankAccountsCards, normalizeAccountBody, normalizeCardBody } from './_shared'
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankAccountsView)
  if (permission instanceof NextResponse) return permission

  try {
    const { searchParams } = new URL(request.url)
    const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'bank_name', direction: 'asc' })
    const { from, to } = listRange(listQuery)
    const data = await listBankAccountsCards(supabase as any, { includePassive: searchParams.get('include_passive') === 'true' })
    let rows = data.rows
    if (listQuery.search) {
      const search = listQuery.search.toLowerCase()
      rows = rows.filter((row: any) => [row.bank_name, row.company_name, row.iban, row.card_number_masked, row.account_name, row.card_name].some(value => String(value || '').toLowerCase().includes(search)))
    }
    const sortedRows = [...rows].sort((a: any, b: any) => String(a[listQuery.sort || 'bank_name'] || '').localeCompare(String(b[listQuery.sort || 'bank_name'] || ''), 'tr'))
    if (listQuery.direction === 'desc') sortedRows.reverse()
    return NextResponse.json({ data: sortedRows.slice(from, to + 1), meta: listMeta(listQuery, sortedRows.length), accountOptions: data.accountOptions })
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({
        data: [],
        accountOptions: [],
        warning: 'Banka hesap/kart tabloları bulunamadı. İlgili migration uygulanmalı.',
      })
    }

    const message = error instanceof Error ? error.message : 'Hesap ve kartlar yüklenemedi.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankAccountsInsert)
  if (permission instanceof NextResponse) return permission

  try {
    const body = await request.json()
    const recordType = body.record_type === 'card' ? 'card' : 'account'
    const connection = await ensureManualBankConnection(supabase as any, body, permission.userId)

    if (recordType === 'account') {
      const payload = normalizeAccountBody(body, connection, permission.userId)
      if (!payload.account_name) return NextResponse.json({ error: 'Hesap adı zorunludur.' }, { status: 400 })
      const { data, error } = await supabase.from('bank_accounts').insert({ ...payload, created_by: permission.userId }).select(BANK_ACCOUNT_SELECT).single()
      if (error) throw new Error(error.message)
      const account = data as Record<string, any>
      return NextResponse.json({ data: { id: `account:${account.id}`, ...account } }, { status: 201 })
    }

    const payload = normalizeCardBody(body, connection, permission.userId)
    if (!payload.card_name) return NextResponse.json({ error: 'Kart adı zorunludur.' }, { status: 400 })
    const { data, error } = await supabase.from('bank_cards').insert({ ...payload, created_by: permission.userId }).select(BANK_CARD_SELECT).single()
    if (error) throw new Error(error.message)
    const card = data as Record<string, any>
    return NextResponse.json({ data: { id: `card:${card.id}`, ...card } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kayıt oluşturulamadı.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
