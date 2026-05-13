import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankMovementsMatch)
  if (permission instanceof NextResponse) return permission
  const body = await request.json().catch(() => ({}))

  const { data, error } = await supabase
    .from('financial_institution_movements')
    .update({
      match_status: body.preAccountingMovementId ? 'manual_match' : 'matched',
      matched_pre_accounting_movement_id: body.preAccountingMovementId || null,
      matched_at: new Date().toISOString(),
      matched_by: permission.userId,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
