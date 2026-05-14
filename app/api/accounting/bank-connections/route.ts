import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { cleanPayload, enrichConnections, isMissingTableError, missingTableResponse, normalizeConnectionPayload } from '../_banking'
import { BANK_CONNECTION_SELECT } from '../bank-accounts-cards/_shared'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankConnectionsView)
  if (permission instanceof NextResponse) return permission

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('company_id')

  let query = supabase
    .from('bank_connections')
    .select(BANK_CONNECTION_SELECT)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) return missingTableResponse('bank_connections')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: await enrichConnections(supabase as any, data || []) })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankConnectionsInsert)
  if (permission instanceof NextResponse) return permission

  const payload = normalizeConnectionPayload(await request.json())
  if (!payload.bank_name) return NextResponse.json({ error: 'Banka adı zorunludur', code: 'VALIDATION_FAILED' }, { status: 400 })

  const { data, error } = await supabase
    .from('bank_connections')
    .insert(cleanPayload({ ...payload, created_by: permission.userId, updated_by: permission.userId }))
    .select(BANK_CONNECTION_SELECT)
    .single()

  if (error) {
    if (isMissingTableError(error)) return missingTableResponse('bank_connections')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
