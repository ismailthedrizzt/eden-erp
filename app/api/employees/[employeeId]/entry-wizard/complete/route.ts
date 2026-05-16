import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = createServiceClient()
  const startDate = String(body.start_date || body.sgk_entry_date || '').slice(0, 10)
  if (!startDate) return NextResponse.json({ error: 'İşe başlama tarihi zorunludur.' }, { status: 400 })

  const { data: current, error: currentError } = await supabase
    .from('employees')
    .select('id,company_id,record_status,field_history')
    .eq('id', employeeId)
    .maybeSingle()

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'Çalışan bulunamadı.' }, { status: 404 })

  await supabase.from('employee_work_relations').upsert({
    employee_id: employeeId,
    company_id: body.company_id || current.company_id || null,
    relationship_type: body.relationship_type || null,
    sgk_responsibility: body.sgk_responsibility || null,
    payroll_included: body.sgk_responsibility === 'sgk_company',
    start_date: startDate,
    status: 'active',
    payment_type: body.payment_type || null,
    gross_net_type: body.gross_net_type || null,
    currency: body.currency || null,
    payment_period: body.payment_period || null,
    weekly_working_days: nullableNumber(body.weekly_working_days),
    daily_working_hours: nullableNumber(body.daily_working_hours),
    works_saturday: !!body.works_saturday,
    works_sunday: !!body.works_sunday,
    is_shift_based: !!body.is_shift_based,
    has_night_shift: !!body.has_night_shift,
    overtime_applicable: !!body.overtime_applicable,
    works_on_public_holidays: !!body.works_on_public_holidays,
    is_part_time: !!body.is_part_time,
    is_remote: !!body.is_remote,
    workplace_type: body.workplace_type || null,
    disability_status: body.disability_status || null,
    conviction_status: body.conviction_status || null,
    school_or_university: body.school_or_university || null,
    internship_type: body.internship_type || null,
    internship_start_date: body.internship_start_date || null,
    internship_end_date: body.internship_end_date || null,
    school_sgk_notification_status: body.school_sgk_notification_status ? 'confirmed' : null,
    entry_date: startDate,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'employee_id' })

  await supabase.from('employee_work_lifecycle_events').insert({
    employee_id: employeeId,
    company_id: body.company_id || current.company_id || null,
    event_type: body.sgk_responsibility === 'school' ? 'internship_started' : 'entry_completed',
    event_date: startDate,
    relationship_type: body.relationship_type || null,
    sgk_responsibility: body.sgk_responsibility || null,
    old_record_status: current.record_status || 'draft',
    new_record_status: 'active',
    payload_json: body,
  })

  const history = appendLifecycleHistory(current.field_history, 'İşe giriş tamamlandı')
  const { data, error } = await supabase
    .from('employees')
    .update({
      record_status: 'active',
      employment_status: 'active',
      work_status: 'active',
      sgk_entry_date: startDate,
      sgk_entry_method: body.run_sgk_entry ? 'servis' : body.sgk_entry_method || 'web',
      field_history: history,
    })
    .eq('id', employeeId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

function nullableNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
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
