import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { OWNERSHIP_TRANSACTION_SELECT } from '../../_shared'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const { data: current, error: currentError } = await supabase.from('ownership_transactions').select(OWNERSHIP_TRANSACTION_SELECT).eq('id', id).single()
  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })

  const history = [...(Array.isArray(current.history) ? current.history : []), { action: 'Reddedildi', changed_at: now, changed_by: 'Sistem Kullanıcısı' }]
  const { data, error } = await supabase
    .from('ownership_transactions')
    .update({
      approval_status: 'rejected',
      workflow_status: 'rejected',
      status: 'draft',
      rejection_reason: body.rejection_reason || null,
      history,
      updated_at: now,
    })
    .eq('id', id)
    .select(OWNERSHIP_TRANSACTION_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'REJECT_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}
