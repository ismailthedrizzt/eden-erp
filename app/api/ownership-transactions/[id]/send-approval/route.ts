// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: ownership
// TARGET_FASTAPI_ENDPOINT: /api/v1/ownership-transactions/{transaction_id}/send-approval
// NOTES: Contains ownership approval flow trigger logic; move to Python process/orchestrator layer.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { OWNERSHIP_TRANSACTION_SELECT } from '../../_shared'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  const { data: current, error: currentError } = await supabase.from('ownership_transactions').select(OWNERSHIP_TRANSACTION_SELECT).eq('id', id).single()
  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
  if (current.approval_status === 'approved') return NextResponse.json({ error: 'Onaylı işlem tekrar onaya gönderilemez', code: 'ALREADY_APPROVED' }, { status: 409 })

  const history = [...(Array.isArray(current.history) ? current.history : []), { action: 'Onaya gönderildi', changed_at: now, changed_by: 'Sistem Kullanıcısı' }]
  const { data, error } = await supabase
    .from('ownership_transactions')
    .update({ approval_status: 'pending_approval', workflow_status: 'pending_approval', status: 'draft', history, updated_at: now })
    .eq('id', id)
    .select(OWNERSHIP_TRANSACTION_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'SEND_APPROVAL_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}
