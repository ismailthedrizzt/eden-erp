import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { normalizeMovementPayload } from '../../_banking'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankMovementsView)
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase.from('financial_institution_movements').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankMovementsInsertManual)
  if (permission instanceof NextResponse) return permission

  const payload = normalizeMovementPayload(await request.json())
  const { data, error } = await supabase.from('financial_institution_movements').update({ ...payload, updated_at: new Date().toISOString(), updated_by: permission.userId }).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
