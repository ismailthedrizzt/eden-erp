import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const { data: current, error: currentError } = await supabase.from('ownership_transactions').select('*').eq('id', id).single()
  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
  if (current.approval_status !== 'approved') return NextResponse.json({ error: 'Sadece onaylı işlem için ters kayıt oluşturulabilir', code: 'NOT_APPROVED' }, { status: 409 })

  const { count } = await supabase.from('ownership_transactions').select('id', { count: 'exact', head: true })
  const reversal = {
    ...current,
    id: undefined,
    transaction_no: `OI-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(5, '0')}`,
    transaction_type: 'Ters Kayıt',
    from_partner_id: current.to_partner_id,
    to_partner_id: current.from_partner_id,
    affected_partner_id: current.affected_partner_id,
    transaction_date: now.slice(0, 10),
    effective_date: now.slice(0, 10),
    status: 'draft',
    approval_status: 'draft',
    workflow_status: 'draft',
    notes: `Ters kayıt kaynağı: ${current.transaction_no}`,
    history: [{ action: 'Ters kayıt oluşturuldu', source_transaction_id: id, changed_at: now, changed_by: 'Sistem Kullanıcısı' }],
    created_at: now,
    updated_at: now,
    approved_at: null,
    approved_by: null,
    is_deleted: false,
    deleted_at: null,
    deleted_by: null,
    version: 1,
  }

  const { data, error } = await supabase.from('ownership_transactions').insert(reversal).select().single()
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'REVERSE_FAILED' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
