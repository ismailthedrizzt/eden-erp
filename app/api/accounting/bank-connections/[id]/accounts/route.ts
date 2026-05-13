import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingTableError, missingTableResponse, normalizeAccountPayload } from '../../../_banking'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankAccountsView)
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase.from('bank_accounts').select('*').eq('bank_connection_id', id).eq('is_deleted', false).order('created_at', { ascending: false })
  if (error) {
    if (isMissingTableError(error)) return missingTableResponse('bank_accounts')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data: data || [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankAccountsInsert)
  if (permission instanceof NextResponse) return permission

  const { data: connection } = await supabase.from('bank_connections').select('*').eq('id', id).maybeSingle()
  const payload = normalizeAccountPayload(await request.json(), connection || { id })
  if (!payload.account_name) return NextResponse.json({ error: 'Hesap adı zorunludur', code: 'VALIDATION_FAILED' }, { status: 400 })

  const { data, error } = await supabase.from('bank_accounts').insert({ ...payload, created_by: permission.userId, updated_by: permission.userId }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
