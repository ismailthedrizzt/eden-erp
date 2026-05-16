import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = createServiceClient()
  const exitDate = String(body.exit_date || body.sgk_exit_date || '').slice(0, 10)
  if (!exitDate) return NextResponse.json({ error: 'İşten çıkış tarihi zorunludur.' }, { status: 400 })

  const { data: current, error: currentError } = await supabase
    .from('employees')
    .select('id,company_id,record_status,field_history')
    .eq('id', employeeId)
    .maybeSingle()

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'Çalışan bulunamadı.' }, { status: 404 })

  await supabase
    .from('employee_work_relations')
    .update({
      end_date: exitDate,
      exit_date: exitDate,
      exit_reason: body.exit_reason || body.termination_reason || null,
      status: 'passive',
      updated_at: new Date().toISOString(),
    })
    .eq('employee_id', employeeId)

  await supabase.from('employee_work_lifecycle_events').insert({
    employee_id: employeeId,
    company_id: current.company_id || null,
    event_type: 'exit_completed',
    event_date: exitDate,
    old_record_status: current.record_status || 'active',
    new_record_status: 'passive',
    payload_json: body,
    document_reference_id: body.closing_document_id || null,
  })

  const history = appendLifecycleHistory(current.field_history, 'İşten çıkış tamamlandı')
  const { data, error } = await supabase
    .from('employees')
    .update({
      record_status: 'passive',
      employment_status: 'terminated',
      work_status: 'terminated',
      exit_date: exitDate,
      sgk_exit_method: body.run_sgk_exit ? 'servis' : body.sgk_exit_method || 'web',
      sgk_exit_reason: body.sgk_exit_reason || body.exit_reason || null,
      field_history: history,
    })
    .eq('id', employeeId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

function appendLifecycleHistory(existing: unknown, action: string) {
  const history = existing && typeof existing === 'object' ? existing as Record<string, any[]> : {}
  return {
    ...history,
    record_status: [
      ...(history.record_status || []),
      { value: action, date: new Date().toISOString(), user: 'Sistem Kullanıcısı' },
    ],
  }
}
