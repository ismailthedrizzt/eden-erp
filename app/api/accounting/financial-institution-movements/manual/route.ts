import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { requirePermission } from '@/lib/security/serverPermissions'
import { normalizeMovementPayload } from '../../_banking'
import { FINANCIAL_MOVEMENT_SELECT } from '../_selects'

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankMovementsInsertManual)
  if (permission instanceof NextResponse) return permission

  const payload = normalizeMovementPayload({ ...(await request.json()), source: 'manual' })
  if (!payload.movement_date || !payload.amount) return NextResponse.json({ error: 'Tarih ve tutar zorunludur', code: 'VALIDATION_FAILED' }, { status: 400 })

  const { data, error } = await supabase.from('financial_institution_movements').insert({ ...payload, created_by: permission.userId, updated_by: permission.userId }).select(FINANCIAL_MOVEMENT_SELECT).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
