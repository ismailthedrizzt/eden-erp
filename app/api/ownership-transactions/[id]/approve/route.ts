// BACKEND_MIGRATION_STATUS: deprecated_wrapper
// TARGET_BACKEND_MODULE: ownership
// TARGET_FASTAPI_ENDPOINT: /api/v1/ownership-transactions/{transaction_id}/approve
// NOTES: Contains ownership transaction approval logic; Next.js route should become BFF/proxy after Python migration.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { OWNERSHIP_TRANSACTION_SELECT, validateDraft } from '../../_shared'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json().catch(() => ({}))
  const now = new Date().toISOString()
  const { data: current, error: currentError } = await supabase.from('ownership_transactions').select(OWNERSHIP_TRANSACTION_SELECT).eq('id', id).single()
  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })

  const validation = await validateDraft(supabase, current)
  if (!validation.ok) return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 })
  const severeWarnings = validation.warnings.filter((warning: string) => ['Devreden ortağın yeterli payı yok', 'Tarihsel çakışma var', 'Döngüsel ortaklık riski'].includes(warning))
  if (severeWarnings.length) return NextResponse.json({ error: severeWarnings.join(', '), code: 'APPROVAL_BLOCKED' }, { status: 409 })

  const history = [
    ...(Array.isArray(current.history) ? current.history : []),
    { action: 'Onaylandı', changed_at: now, changed_by: 'Sistem Kullanıcısı' },
    { action: 'Etkileri hesaplandı', changed_at: now, changed_by: 'Sistem Kullanıcısı' },
  ]
  const { data, error } = await supabase
    .from('ownership_transactions')
    .update({
      approval_status: 'approved',
      workflow_status: 'approved',
      status: 'active',
      approval_notes: body.approval_notes || current.approval_notes || null,
      approved_at: now,
      history,
      warnings: validation.warnings,
      updated_at: now,
    })
    .eq('id', id)
    .select(OWNERSHIP_TRANSACTION_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'APPROVE_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}
