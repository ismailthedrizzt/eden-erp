import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { FINANCIAL_MOVEMENT_SELECT } from '../../_selects'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankMovementsPassivate)
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase.from('financial_institution_movements').update({ status: 'passive', match_status: 'cancelled', is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: permission.userId }).eq('id', id).select(FINANCIAL_MOVEMENT_SELECT).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
