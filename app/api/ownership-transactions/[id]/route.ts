import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateDraft } from '../_shared'

const LOCKED_WHEN_APPROVED = new Set([
  'company_id',
  'transaction_type',
  'transaction_date',
  'effective_date',
  'from_partner_id',
  'to_partner_id',
  'affected_partner_id',
  'share_ratio',
  'voting_ratio',
  'profit_ratio',
  'share_units',
  'nominal_value',
  'capital_amount',
  'new_capital_amount',
  'committed_capital_amount',
  'transfer_price',
  'currency',
  'has_veto_right',
  'has_board_nomination_right',
  'has_privileged_share',
  'privilege_type',
  'privilege_description',
  'privilege_start_date',
  'privilege_end_date',
  'removed_privilege_type',
  'removal_date',
  'old_voting_ratio',
  'new_voting_ratio',
  'old_profit_ratio',
  'new_profit_ratio',
  'commitment_date',
  'capital_distribution',
])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('ownership_transactions')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const { data: current, error: currentError } = await supabase
    .from('ownership_transactions')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
  if (current.approval_status === 'approved' && Object.keys(body).some(key => LOCKED_WHEN_APPROVED.has(key))) {
    return NextResponse.json({ error: 'Onaylı işlem sessizce değiştirilemez. Ters kayıt veya düzeltme kaydı oluşturun.', code: 'APPROVED_RECORD_LOCKED' }, { status: 409 })
  }

  const merged = { ...current, ...body }
  const validation = await validateDraft(supabase, merged)
  if (!validation.ok) return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 })

  const history = [
    ...(Array.isArray(current.history) ? current.history : []),
    ...Object.entries(body).map(([field, nextValue]) => ({
      field,
      old_value: current[field],
      new_value: nextValue,
      changed_at: new Date().toISOString(),
      changed_by: 'Sistem Kullanıcısı',
    })),
  ]

  const { data, error } = await supabase
    .from('ownership_transactions')
    .update({
      ...body,
      warnings: validation.warnings,
      history,
      version: Number(current.version || 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('ownership_transactions')
    .update({
      is_deleted: true,
      status: 'passive',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'SOFT_DELETE_FAILED' }, { status: 500 })
  return NextResponse.json({ success: true })
}
