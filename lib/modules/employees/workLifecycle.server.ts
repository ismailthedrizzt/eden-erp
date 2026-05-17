import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isCompanySgk, normalizeSgkResponsibility } from './workLifecycle'

export const EMPLOYEE_WORK_PERMISSIONS = {
  employeesView: 'employees.view',
  entryStart: 'employees.entry.start',
  entryComplete: 'employees.entry.complete',
  entryManualSgk: 'employees.entry.manual_sgk',
  exitStart: 'employees.exit.start',
  exitComplete: 'employees.exit.complete',
  exitManualSgk: 'employees.exit.manual_sgk',
  workRelationView: 'employees.work_relation.view',
  workRelationEdit: 'employees.work_relation.edit',
  lifecycleView: 'employees.lifecycle.view',
} as const

type Supabase = ReturnType<typeof createServiceClient>
type MutationResult = { data: any; error: any }

const BASE_EMPLOYEE_COLUMNS = [
  'id',
  'person_id',
]

const OPTIONAL_EMPLOYEE_COLUMNS = [
  'company_id',
  'unit_id',
  'position_id',
  'job_title',
  'record_status',
  'employment_status',
  'work_status',
  'sgk_entry_date',
  'exit_date',
  'field_history',
  'employee_no',
  'entry_date',
  'start_date',
  'work_type',
  'sgk_entry_reference_no',
  'sgk_entry_method',
  'sgk_exit_reference_no',
  'sgk_exit_method',
  'sgk_exit_reason',
]

export async function getEmployeeWizardContext(
  request: NextRequest,
  employeeId: string,
  mode: 'entry' | 'exit'
) {
  const supabase = createServiceClient()
  const permission = await requirePermission(
    request,
    supabase,
    mode === 'entry' ? EMPLOYEE_WORK_PERMISSIONS.entryStart : EMPLOYEE_WORK_PERMISSIONS.exitStart
  )
  if (permission instanceof NextResponse) return permission

  const { data: employee, error } = await fetchEmployee(supabase, employeeId)
  if (error) return employeeErrorResponse(error)
  if (!employee) return NextResponse.json({ error: 'Çalışan bulunamadı.', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })

  const [workRelation, lifecycleEvents, companies, units, positions] = await Promise.all([
    fetchCurrentWorkRelation(supabase, employeeId),
    fetchLifecycleEvents(supabase, employeeId),
    safeReferenceList(supabase, 'companies', 'id, short_name, trade_name, status, is_deleted', 'trade_name'),
    safeReferenceList(supabase, 'organization_units', 'id, company_id, name, type, status, active, is_deleted', 'name'),
    safeReferenceList(supabase, 'positions', 'id, unit_id, title, status, is_deleted', 'title'),
  ])

  return NextResponse.json({
    data: {
      employee,
      workRelation: workRelation.data || null,
      lifecycleEvents: lifecycleEvents.data || [],
      references: {
        companies: (companies.data || []).filter((row: any) => !row.is_deleted),
        units: (units.data || []).filter((row: any) => !row.is_deleted && row.status !== 'passive'),
        positions: (positions.data || []).filter((row: any) => !row.is_deleted && row.status !== 'closed'),
      },
      computedManagerText: 'Bağlı Yönetici: Teşkilat yapısından otomatik belirlenecek',
    },
  })
}

export async function completeEmployeeEntry(
  request: NextRequest,
  employeeId: string,
  manualSgk: boolean
) {
  const supabase = createServiceClient()
  const permission = await requirePermission(
    request,
    supabase,
    manualSgk ? EMPLOYEE_WORK_PERMISSIONS.entryManualSgk : EMPLOYEE_WORK_PERMISSIONS.entryComplete
  )
  if (permission instanceof NextResponse) return permission

  const body = await request.json().catch(() => ({}))
  const manual = body.manual_sgk || {}
  const startDate = cleanDate(body.start_date || body.sgk_entry_date || manual.sgk_entry_date)
  if (!startDate) return NextResponse.json({ error: 'İşe başlama tarihi zorunludur.', code: 'START_DATE_REQUIRED' }, { status: 400 })

  const sgkResponsibility = normalizeSgkResponsibility(body.sgk_responsibility)
  if (!manualSgk && isCompanySgk(sgkResponsibility)) {
    return NextResponse.json({
      error: 'SGK sorumlusu Şirket ise işe giriş SGK Girişi Yapıldı bilgisiyle tamamlanmalıdır.',
      code: 'MANUAL_SGK_REQUIRED',
    }, { status: 400 })
  }
  if (manualSgk && !isCompanySgk(sgkResponsibility)) {
    return NextResponse.json({
      error: 'Manuel SGK girişi sadece SGK sorumlusu Şirket ise kullanılabilir.',
      code: 'COMPANY_SGK_REQUIRED',
    }, { status: 400 })
  }

  const { data: current, error: currentError } = await fetchEmployee(supabase, employeeId)
  if (currentError) return employeeErrorResponse(currentError)
  if (!current) return NextResponse.json({ error: 'Çalışan bulunamadı.', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
  const currentEmployee = current as Record<string, any>

  const rpcPayload = await tryTransactionRpc(supabase, 'complete_employee_entry_wizard', employeeId, body, manualSgk, permission.userId)
  if (rpcPayload) return NextResponse.json(rpcPayload)

  const companyId = cleanUuid(body.company_id) || currentEmployee.company_id || null
  const relationPayload = buildEntryRelationPayload(employeeId, companyId, body, manual, startDate, manualSgk)
  const relationResult = await upsertWorkRelation(supabase, employeeId, relationPayload)
  if (relationResult.error) return NextResponse.json({ error: relationResult.error.message, code: relationResult.error.code || 'WORK_RELATION_FAILED' }, { status: 500 })

  const eventType = manualSgk ? 'sgk_entry_manual_completed' : entryEventType(body)
  const eventResult = await insertLifecycleEvent(supabase, {
    employee_id: employeeId,
    company_id: companyId,
    event_type: eventType,
    event_date: startDate,
    old_record_status: currentEmployee.record_status || 'draft',
    new_record_status: 'active',
    payload: body,
    payload_json: body,
    document_reference_id: manual.sgk_entry_document_id || null,
    created_by: permission.userId,
  })
  if (eventResult.error) return NextResponse.json({ error: eventResult.error.message, code: eventResult.error.code || 'LIFECYCLE_EVENT_FAILED' }, { status: 500 })

  const employeeResult = await updateEmployee(supabase, employeeId, {
    record_status: 'active',
    employment_status: 'active',
    work_status: 'active',
    entry_date: startDate,
    start_date: startDate,
    sgk_entry_date: cleanDate(manual.sgk_entry_date || body.sgk_entry_date || startDate),
    sgk_entry_reference_no: manual.sgk_entry_reference_no || body.sgk_entry_reference_no || null,
    sgk_entry_method: manualSgk ? 'web' : body.sgk_entry_method || null,
    work_type: body.employment_type || body.relationship_type || null,
    company_id: companyId,
    unit_id: cleanUuid(body.company_unit_id) || currentEmployee.unit_id || null,
    position_id: cleanUuid(body.position_id) || currentEmployee.position_id || null,
    field_history: appendLifecycleHistory(currentEmployee.field_history, manualSgk ? 'SGK işe girişi manuel tamamlandı' : 'İşe giriş tamamlandı'),
  })

  if (employeeResult.error) return NextResponse.json({ error: employeeResult.error.message, code: employeeResult.error.code || 'EMPLOYEE_UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: employeeResult.data })
}

export async function completeEmployeeExit(
  request: NextRequest,
  employeeId: string,
  manualSgk: boolean
) {
  const supabase = createServiceClient()
  const permission = await requirePermission(
    request,
    supabase,
    manualSgk ? EMPLOYEE_WORK_PERMISSIONS.exitManualSgk : EMPLOYEE_WORK_PERMISSIONS.exitComplete
  )
  if (permission instanceof NextResponse) return permission

  const body = await request.json().catch(() => ({}))
  const manual = body.manual_sgk || {}
  const exitDate = cleanDate(body.exit_date || body.sgk_exit_date || manual.sgk_exit_date)
  if (!exitDate) return NextResponse.json({ error: 'İşten çıkış tarihi zorunludur.', code: 'EXIT_DATE_REQUIRED' }, { status: 400 })

  const { data: current, error: currentError } = await fetchEmployee(supabase, employeeId)
  if (currentError) return employeeErrorResponse(currentError)
  if (!current) return NextResponse.json({ error: 'Çalışan bulunamadı.', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
  const currentEmployee = current as Record<string, any>

  const currentRelation = await fetchCurrentWorkRelation(supabase, employeeId)
  const sgkResponsibility = normalizeSgkResponsibility(body.sgk_responsibility || currentRelation.data?.sgk_responsibility)
  if (!manualSgk && isCompanySgk(sgkResponsibility)) {
    return NextResponse.json({
      error: 'SGK sorumlusu Şirket ise çıkış SGK Çıkışı Yapıldı bilgisiyle tamamlanmalıdır.',
      code: 'MANUAL_SGK_REQUIRED',
    }, { status: 400 })
  }
  if (manualSgk && !isCompanySgk(sgkResponsibility)) {
    return NextResponse.json({
      error: 'Manuel SGK çıkışı sadece SGK sorumlusu Şirket ise kullanılabilir.',
      code: 'COMPANY_SGK_REQUIRED',
    }, { status: 400 })
  }

  const rpcPayload = await tryTransactionRpc(supabase, 'complete_employee_exit_wizard', employeeId, body, manualSgk, permission.userId)
  if (rpcPayload) return NextResponse.json(rpcPayload)

  const companyId = cleanUuid(body.company_id) || currentEmployee.company_id || currentRelation.data?.company_id || null
  const relationResult = await updateCurrentWorkRelation(supabase, employeeId, buildExitRelationPayload(body, manual, exitDate, manualSgk))
  if (relationResult.error) return NextResponse.json({ error: relationResult.error.message, code: relationResult.error.code || 'WORK_RELATION_FAILED' }, { status: 500 })

  const eventType = manualSgk ? 'sgk_exit_manual_completed' : exitEventType(body, currentRelation.data)
  const eventResult = await insertLifecycleEvent(supabase, {
    employee_id: employeeId,
    company_id: companyId,
    event_type: eventType,
    event_date: exitDate,
    old_record_status: currentEmployee.record_status || 'active',
    new_record_status: 'passive',
    payload: body,
    payload_json: body,
    document_reference_id: manual.sgk_exit_document_id || body.closing_document_id || null,
    created_by: permission.userId,
  })
  if (eventResult.error) return NextResponse.json({ error: eventResult.error.message, code: eventResult.error.code || 'LIFECYCLE_EVENT_FAILED' }, { status: 500 })

  const employeeResult = await updateEmployee(supabase, employeeId, {
    record_status: 'passive',
    employment_status: 'terminated',
    work_status: 'terminated',
    exit_date: exitDate,
    sgk_exit_reference_no: manual.sgk_exit_reference_no || body.sgk_exit_reference_no || null,
    sgk_exit_method: manualSgk ? 'web' : body.sgk_exit_method || null,
    sgk_exit_reason: body.sgk_exit_reason || body.exit_reason || null,
    field_history: appendLifecycleHistory(currentEmployee.field_history, manualSgk ? 'SGK işten çıkışı manuel tamamlandı' : 'İşten çıkış tamamlandı'),
  })

  if (employeeResult.error) return NextResponse.json({ error: employeeResult.error.message, code: employeeResult.error.code || 'EMPLOYEE_UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: employeeResult.data })
}

export async function fetchCurrentWorkRelation(supabase: Supabase, employeeId: string) {
  const result = await supabase
    .from('employee_work_relations')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (result.error && result.error.code === 'PGRST116') return { data: null, error: null }
  return result
}

export async function fetchLifecycleEvents(supabase: Supabase, employeeId: string) {
  const result = await supabase
    .from('employee_work_lifecycle_events')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  return result.error ? { data: [], error: result.error } : { data: result.data || [], error: null }
}

async function fetchEmployee(supabase: Supabase, employeeId: string) {
  let optionalColumns = [...OPTIONAL_EMPLOYEE_COLUMNS]
  let useLegacyColumns = false
  const legacyOptionalColumns = ['record_status']

  while (true) {
    const result = await supabase
      .from('employees')
      .select([...BASE_EMPLOYEE_COLUMNS, ...optionalColumns].join(','))
      .eq('id', employeeId)
      .maybeSingle()

    const missing = missingPayloadColumn(result.error, optionalColumns)
    if (missing) {
      if (!useLegacyColumns) {
        useLegacyColumns = true
        optionalColumns = optionalColumns.filter(column => legacyOptionalColumns.includes(column))
        continue
      }
      optionalColumns = optionalColumns.filter(column => column !== missing)
      continue
    }

    if (result.error || !result.data) return result
    return { data: await attachPersonName(supabase, result.data), error: null }
  }
}

async function attachPersonName(supabase: Supabase, employee: Record<string, any>) {
  if (!employee.person_id) return employee

  const { data } = await supabase
    .from('persons')
    .select('id,first_name,last_name,full_name')
    .eq('id', employee.person_id)
    .maybeSingle()

  if (!data) return employee
  return {
    ...employee,
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    full_name: data.full_name || [data.first_name, data.last_name].filter(Boolean).join(' '),
  }
}

async function safeReferenceList(supabase: Supabase, table: string, select: string, order: string) {
  const result = await supabase.from(table).select(select).order(order, { ascending: true }).limit(500)
  if (result.error) return { data: [], error: result.error }
  return { data: result.data || [], error: null }
}

async function tryTransactionRpc(
  supabase: Supabase,
  functionName: string,
  employeeId: string,
  payload: Record<string, any>,
  manualSgk: boolean,
  userId: string | null
) {
  const result = await supabase.rpc(functionName, {
    p_employee_id: employeeId,
    p_payload: payload,
    p_manual_sgk: manualSgk,
    p_user_id: userId,
  })

  if (!result.error) return result.data || { data: null }
  if (isMissingRpcError(result.error)) return null
  throw result.error
}

function buildEntryRelationPayload(
  employeeId: string,
  companyId: string | null,
  body: Record<string, any>,
  manual: Record<string, any>,
  startDate: string,
  manualSgk: boolean
) {
  const sgkResponsibility = normalizeSgkResponsibility(body.sgk_responsibility)
  return cleanPayload({
    employee_id: employeeId,
    company_id: companyId,
    employment_type: body.employment_type || body.relationship_type || null,
    duration_type: body.duration_type || null,
    sgk_responsibility: sgkResponsibility,
    work_arrangement: body.work_arrangement || null,
    relation_type: body.employment_type || body.relationship_type || null,
    start_date: startDate,
    status: 'active',
    company_unit_id: cleanUuid(body.company_unit_id),
    unit_id: cleanUuid(body.company_unit_id),
    position_id: cleanUuid(body.position_id),
    computed_manager_employee_id: cleanUuid(body.computed_manager_employee_id),
    work_location_id: cleanUuid(body.work_location_id),
    cost_center_id: cleanUuid(body.cost_center_id),
    project_id: cleanUuid(body.project_id),
    shift_group_id: cleanUuid(body.shift_group_id),
    vessel_or_platform_id: cleanUuid(body.vessel_or_platform_id),
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
    disability_status: body.disability_status || null,
    conviction_status: body.conviction_status || null,
    sgk_entry_date: cleanDate(manual.sgk_entry_date || body.sgk_entry_date || startDate),
    sgk_entry_reference_no: manual.sgk_entry_reference_no || body.sgk_entry_reference_no || null,
    sgk_entry_document_id: cleanDocumentId(manual.sgk_entry_document_id || manual.sgk_entry_document || body.sgk_entry_document_id),
    sgk_entry_web_completed: manualSgk ? !!manual.sgk_entry_web_completed : !!body.sgk_entry_web_completed,
    sgk_submission_status: manualSgk ? 'manually_completed' : isCompanySgk(sgkResponsibility) ? 'pending_manual' : 'not_required',
    insurance_branch: body.insurance_branch || null,
    occupation_code: body.occupation_code || null,
    duty_code: body.duty_code || null,
    csgb_work_branch: body.csgb_work_branch || null,
    education_code: body.education_code || null,
    partial_day: body.partial_day || null,
    reference_code: body.reference_code || null,
    school_or_university: body.school_or_university || null,
    department_or_program: body.department_or_program || null,
    internship_type: body.internship_type || null,
    internship_start_date: cleanDate(body.internship_start_date),
    internship_end_date: cleanDate(body.internship_end_date),
    school_sgk_notification_status: body.school_sgk_notification_status || null,
    school_sgk_document_id: cleanDocumentId(body.school_sgk_document_id),
    internship_protocol_document_id: cleanDocumentId(body.internship_protocol_document_id),
    contract_type: body.contract_type || null,
    contract_start_date: cleanDate(body.contract_start_date),
    contract_end_date: cleanDate(body.contract_end_date),
    service_type: body.service_type || null,
    invoice_required: body.invoice_required === 'yes' || body.invoice_required === true,
    account_card_id: cleanUuid(body.account_card_id),
    contract_document_id: cleanDocumentId(body.contract_document_id),
    nda_document_id: cleanDocumentId(body.nda_document_id),
    updated_at: new Date().toISOString(),
  })
}

function buildExitRelationPayload(body: Record<string, any>, manual: Record<string, any>, exitDate: string, manualSgk: boolean) {
  return cleanPayload({
    end_date: exitDate,
    exit_date: exitDate,
    exit_reason: body.exit_reason || body.termination_reason || null,
    status: 'passive',
    sgk_exit_date: cleanDate(manual.sgk_exit_date || body.sgk_exit_date || exitDate),
    sgk_exit_reference_no: manual.sgk_exit_reference_no || body.sgk_exit_reference_no || null,
    sgk_exit_document_id: cleanDocumentId(manual.sgk_exit_document_id || manual.sgk_exit_document || body.sgk_exit_document_id),
    sgk_exit_web_completed: manualSgk ? !!manual.sgk_exit_web_completed : !!body.sgk_exit_web_completed,
    sgk_exit_status: manualSgk ? 'manually_completed' : null,
    occupation_code: body.sgk_exit_occupation_code || body.occupation_code || null,
    csgb_work_branch: body.sgk_exit_csgb_work_branch || body.csgb_work_branch || null,
    reference_code: body.sgk_exit_reference_code || body.reference_code || null,
    contract_end_date: cleanDate(body.contract_end_date || body.actual_service_end_date),
    updated_at: new Date().toISOString(),
  })
}

async function upsertWorkRelation(supabase: Supabase, employeeId: string, payload: Record<string, any>) {
  const current = await fetchCurrentWorkRelation(supabase, employeeId)
  if (current.error) return current

  if (current.data?.id) {
    return mutateWithMissingColumnFallback(payload, next =>
      supabase
        .from('employee_work_relations')
        .update(next)
        .eq('id', current.data.id)
        .select()
        .single()
    )
  }

  return mutateWithMissingColumnFallback(payload, next =>
    supabase
      .from('employee_work_relations')
      .insert(next)
      .select()
      .single()
  )
}

async function updateCurrentWorkRelation(supabase: Supabase, employeeId: string, payload: Record<string, any>) {
  const current = await fetchCurrentWorkRelation(supabase, employeeId)
  if (current.error) return current
  if (!current.data?.id) return { data: null, error: null }

  return mutateWithMissingColumnFallback(payload, next =>
    supabase
      .from('employee_work_relations')
      .update(next)
      .eq('id', current.data.id)
      .select()
      .single()
  )
}

async function updateEmployee(supabase: Supabase, employeeId: string, payload: Record<string, any>) {
  return mutateWithMissingColumnFallback(cleanPayload(payload), next =>
    supabase
      .from('employees')
      .update(next)
      .eq('id', employeeId)
      .select()
      .single()
  )
}

async function insertLifecycleEvent(supabase: Supabase, payload: Record<string, any>) {
  return mutateWithMissingColumnFallback(cleanPayload(payload), next =>
    supabase
      .from('employee_work_lifecycle_events')
      .insert(next)
      .select()
      .single()
  )
}

async function mutateWithMissingColumnFallback(
  payload: Record<string, any>,
  mutate: (payload: Record<string, any>) => PromiseLike<MutationResult>
): Promise<MutationResult> {
  let next = { ...payload }

  while (true) {
    const result = await mutate(next)
    const missing = missingPayloadColumn(result.error, Object.keys(next))
    if (missing) {
      next = { ...next }
      delete next[missing]
      continue
    }
    return result
  }
}

function missingPayloadColumn(error: { message?: string; code?: string } | null, candidates: string[]) {
  if (!error) return ''
  const message = error.message || ''
  const direct = message.match(/'([^']+)' column/)?.[1] || message.match(/column "([^"]+)"/)?.[1]
  if (direct && candidates.includes(direct)) return direct

  if (error.code === 'PGRST204' || message.includes('schema cache') || message.includes('does not exist')) {
    return candidates.find(column => message.includes(column)) || ''
  }

  return ''
}

function isMissingRpcError(error: { message?: string; code?: string } | null) {
  const message = error?.message || ''
  return error?.code === 'PGRST202' || (message.includes('function') && message.includes('schema cache'))
}

function employeeErrorResponse(error: any) {
  if (error.code === 'PGRST116') {
    return NextResponse.json({ error: 'Çalışan bulunamadı.', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
}

function cleanPayload(payload: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  )
}

function cleanDate(value: unknown) {
  const text = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

function cleanUuid(value: unknown) {
  const text = String(value || '').trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null
}

function cleanDocumentId(value: unknown) {
  if (!value) return null
  if (typeof value === 'string') return value || null
  if (typeof value === 'object') {
    const record = value as Record<string, any>
    return record.documentId || record.document_id || record.id || record.storagePath || record.name || null
  }
  return null
}

function nullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
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

function entryEventType(body: Record<string, any>) {
  if (body.employment_type === 'intern' || normalizeSgkResponsibility(body.sgk_responsibility) === 'school_university') return 'internship_started'
  if (body.employment_type === 'marine' || body.duration_type === 'voyage_based' || body.work_arrangement === 'marine_vessel') return 'marine_contract_started'
  if (['contracted', 'outsourced', 'consultant_freelancer'].includes(body.employment_type)) return 'contract_started'
  return 'entry_completed'
}

function exitEventType(body: Record<string, any>, relation: Record<string, any> | null) {
  const employmentType = body.employment_type || relation?.employment_type
  const durationType = body.duration_type || relation?.duration_type
  const arrangement = body.work_arrangement || relation?.work_arrangement
  if (employmentType === 'intern' || normalizeSgkResponsibility(body.sgk_responsibility || relation?.sgk_responsibility) === 'school_university') return 'internship_completed'
  if (employmentType === 'marine' || durationType === 'voyage_based' || arrangement === 'marine_vessel') return 'marine_contract_completed'
  if (['contracted', 'outsourced', 'consultant_freelancer'].includes(employmentType)) return 'contract_terminated'
  return 'exit_completed'
}
