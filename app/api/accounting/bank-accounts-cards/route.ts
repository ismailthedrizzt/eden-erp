import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingTableError } from '../_banking'
import { ensureManualBankConnection, listBankAccountsCards, normalizeAccountBody, normalizeCardBody } from './_shared'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankAccountsView)
  if (permission instanceof NextResponse) return permission

  try {
    const data = await listBankAccountsCards(supabase as any)
    return NextResponse.json({ data: data.rows, accountOptions: data.accountOptions })
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
      const { data, error } = await supabase.from('bank_accounts').insert({ ...payload, created_by: permission.userId }).select('*').single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ data: { id: `account:${data.id}`, ...data } }, { status: 201 })
    }

    const payload = normalizeCardBody(body, connection, permission.userId)
    if (!payload.card_name) return NextResponse.json({ error: 'Kart adı zorunludur.' }, { status: 400 })
    const { data, error } = await supabase.from('bank_cards').insert({ ...payload, created_by: permission.userId }).select('*').single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data: { id: `card:${data.id}`, ...data } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kayıt oluşturulamadı.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
