import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const { data: current, error: currentError } = await supabase.from('ownership_transactions').select('*').eq('id', id).single()
  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })

  const history = [...(Array.isArray(current.history) ? current.history : []), { action: 'İptal edildi', note: body.reason || null, changed_at: now, changed_by: 'Sistem Kullanıcısı' }]
  const { data, error } = await supabase
    .from('ownership_transactions')
    .update({
      approval_status: 'cancelled',
      workflow_status: 'cancelled',
      status: 'cancelled',
      rejection_reason: body.reason || current.rejection_reason || null,
      history,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CANCEL_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}
