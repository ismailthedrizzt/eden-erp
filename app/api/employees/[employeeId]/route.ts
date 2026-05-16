import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { hydrateMasterContact, syncMasterContact } from '@/lib/identity/masterContact'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'

const EmployeeUpdateSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  nationality: z.string().optional().transform(value => value ? normalizeCountryId(value) : value),
  national_id: z.string().regex(/^\d{11}$/, 'TC Kimlik No 11 haneli sayı olmalıdır').optional(),
  passport_no: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  birth_place: z.string().optional(),
  birth_date: z.string().optional(),
  occupation: z.string().optional(),
  blood_type: z.string().optional(),
  military_status: z.string().optional(),
  deferment_date: z.string().optional(),
  has_disability: z.boolean().optional(),
  disability_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  has_conviction: z.boolean().optional(),
  phones: z.array(z.record(z.any())).optional(),
  emails: z.array(z.record(z.any())).optional(),
  mobile_phone: z.string().optional(),
  work_phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  emergency_contact_first_name: z.string().optional(),
  emergency_contact_last_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  sgk_entry_date: z.string().optional(),
  exit_date: z.string().optional(),
  sgk_entry_method: z.enum(['servis', 'web']).optional(),
  sgk_entry_reference_no: z.string().optional(),
  sgk_entry_reported_by: z.string().optional(),
  sgk_entry_insurance_branch: z.string().optional(),
  sgk_entry_duty_code: z.string().optional(),
  sgk_entry_occupation_code: z.string().optional(),
  sgk_entry_csgb_business_line: z.string().optional(),
  sgk_entry_has_disability: z.enum(['E', 'H']).optional(),
  sgk_entry_has_prior_conviction: z.enum(['E', 'H']).optional(),
  sgk_entry_education_code: z.string().optional(),
  sgk_entry_graduation_year: z.string().optional(),
  sgk_entry_graduation_department: z.string().optional(),
  sgk_entry_partial_day_count: z.string().optional(),
  sgk_exit_method: z.enum(['servis', 'web']).optional(),
  sgk_exit_reference_no: z.string().optional(),
  sgk_exit_reported_by: z.string().optional(),
  sgk_exit_reason: z.string().optional(),
  sgk_exit_occupation_code: z.string().optional(),
  sgk_exit_csgb_business_line: z.string().optional(),
  sgk_exit_percentage_wage_method: z.enum(['E', 'H']).optional(),
  sgk_exit_previous_document_type: z.string().optional(),
  sgk_exit_previous_earned_wage: z.string().optional(),
  sgk_exit_current_document_type: z.string().optional(),
  sgk_exit_current_earned_wage: z.string().optional(),
  work_status: z.enum(['active', 'on_leave', 'terminated', 'suspended']).optional(),
  work_type: z.string().optional(),
  employment_contract_type: z.string().optional(),
  marital_status: z.enum(['single', 'married']).optional(),
  company_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  position_id: z.string().uuid().optional().nullable(),
  job_title: z.string().optional(),
  is_illiterate: z.boolean().optional(),
  education_schools: z.array(z.record(z.any())).optional(),
  foreign_languages: z.array(z.record(z.any())).optional(),
  certificates: z.array(z.record(z.any())).optional(),
  relatives: z.array(z.record(z.any())).optional(),
  entry_documents: z.array(z.record(z.any())).optional(),
  exit_documents: z.array(z.record(z.any())).optional(),
  top_size: z.string().optional(),
  bottom_size: z.string().optional(),
  shoe_size: z.string().optional(),
  kep: z.string().optional(),
  iban: z.string().optional(),
  notes: z.string().optional(),
  photo_url: z.string().optional(),
  cv_document: z.record(z.any()).optional().nullable(),
  diploma_document: z.record(z.any()).optional().nullable(),
  record_status: z.enum(['draft', 'active', 'passive']).optional(),
  employment_status: z.string().optional(),
})

function omitNullishValues(value: Record<string, any>) {
  const nullableFields = new Set(['cv_document', 'diploma_document'])

  return Object.fromEntries(
    Object.entries(value).filter(([key, item]) => nullableFields.has(key) || (item !== null && item !== undefined))
  )
}

const baseEmployeeDetailColumns = [
  'id',
  'person_id',
  'first_name',
  'last_name',
  'nationality',
  'national_id',
  'passport_no',
  'gender',
  'birth_place',
  'birth_date',
  'blood_type',
  'military_status',
  'deferment_date',
  'has_disability',
  'disability_percentage',
  'has_conviction',
  'phones',
  'emails',
  'mobile_phone',
  'work_phone',
  'email',
  'address',
  'city',
  'district',
  'emergency_contact_first_name',
  'emergency_contact_last_name',
  'emergency_contact_relationship',
  'emergency_contact_phone',
  'sgk_entry_date',
  'exit_date',
  'work_status',
  'company_id',
  'unit_id',
  'position_id',
  'job_title',
  'is_illiterate',
  'education_schools',
  'foreign_languages',
  'certificates',
  'relatives',
  'entry_documents',
  'exit_documents',
  'top_size',
  'bottom_size',
  'shoe_size',
  'kep',
  'iban',
  'notes',
  'photo_url',
  'cv_document',
  'diploma_document',
  'field_history',
  'created_at',
  'updated_at',
]

const employeeSgkColumns = [
  'sgk_entry_method',
  'sgk_entry_reference_no',
  'sgk_entry_reported_by',
  'sgk_entry_insurance_branch',
  'sgk_entry_duty_code',
  'sgk_entry_occupation_code',
  'sgk_entry_csgb_business_line',
  'sgk_entry_has_disability',
  'sgk_entry_has_prior_conviction',
  'sgk_entry_education_code',
  'sgk_entry_graduation_year',
  'sgk_entry_graduation_department',
  'sgk_entry_partial_day_count',
  'sgk_exit_method',
  'sgk_exit_reference_no',
  'sgk_exit_reported_by',
  'sgk_exit_reason',
  'sgk_exit_occupation_code',
  'sgk_exit_csgb_business_line',
  'sgk_exit_percentage_wage_method',
  'sgk_exit_previous_document_type',
  'sgk_exit_previous_earned_wage',
  'sgk_exit_current_document_type',
  'sgk_exit_current_earned_wage',
]

const employeeHeroColumns = [
  'id',
  'person_id',
  'first_name',
  'last_name',
  'nationality',
  'national_id',
  'passport_no',
  'gender',
  'birth_place',
  'birth_date',
  'blood_type',
  'job_title',
  'work_status',
  'company_id',
  'unit_id',
  'position_id',
  'created_at',
  'updated_at',
]

const employeeMediaColumns = [
  'id',
  'photo_url',
  'cv_document',
  'diploma_document',
  'updated_at',
]

const optionalEmployeeDetailColumns = [
  'employee_no',
  'employment_status',
  'record_status',
  'start_date',
  'work_type',
  'employment_contract_type',
  'marital_status',
  'version',
  ...employeeSgkColumns,
]

async function fetchEmployeeDetail(
  supabase: ReturnType<typeof createServiceClient>,
  id: string,
  baseColumns = baseEmployeeDetailColumns,
  optionalColumns = optionalEmployeeDetailColumns
): Promise<{ data: Record<string, any> | null; error: any }> {
  let enabledOptionalColumns = [...optionalColumns]

  while (true) {
    const result = await supabase
      .from('employees')
      .select([...baseColumns, ...enabledOptionalColumns].join(','))
      .eq('id', id)
      .single()

    const missingColumn = missingEmployeeColumn(result.error, enabledOptionalColumns)
    if (missingColumn) {
      enabledOptionalColumns = enabledOptionalColumns.filter((column) => column !== missingColumn)
      continue
    }

    return { data: result.data as Record<string, any> | null, error: result.error }
  }
}

// GET /api/employees/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId: id } = await params
  const supabase = createServiceClient()
  const section = new URL(request.url).searchParams.get('section')

  if (section === 'hero') {
    const { data, error } = await fetchEmployeeDetail(supabase, id, employeeHeroColumns, ['employee_no', 'employment_status', 'record_status', 'start_date'])
    if (error) return handleEmployeeDetailError(error)
    if (!data) return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ data })
  }

  if (section === 'media') {
    const { data, error } = await fetchEmployeeDetail(supabase, id, employeeMediaColumns, [])
    if (error) return handleEmployeeDetailError(error)
    if (!data) return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ data })
  }

  const { data, error } = await fetchEmployeeDetail(supabase, id)

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  if (!data) return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })

  const [unit, position] = await Promise.all([
    data.unit_id
      ? supabase.from('organization_units').select('id, name, type').eq('id', data.unit_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    data.position_id
      ? supabase.from('positions').select('id, title').eq('id', data.position_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const relatedError = unit.error || position.error
  if (relatedError) {
    return NextResponse.json({
      error: relatedError.message,
      code: relatedError.code || 'RELATED_FETCH_FAILED',
    }, { status: 500 })
  }

  const hydrated = await hydrateMasterContact(supabase, 'person', {
    ...data,
    ...(unit.data ? { unit: unit.data } : {}),
    ...(position.data ? { position: position.data } : {}),
  })

  return NextResponse.json(
    { data: hydrated },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}

function handleEmployeeDetailError(error: any) {
  if (error.code === 'PGRST116') {
    return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
}

const employeeMasterOnlyFields = ['occupation']

function stripEmployeeMasterOnlyFields<T extends Record<string, any>>(payload: T) {
  const next = { ...payload }
  employeeMasterOnlyFields.forEach(field => {
    delete next[field]
  })
  return next
}

// PATCH /api/employees/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId: id } = await params
  const supabase = createServiceClient()

  const body = omitNullishValues(await request.json())
  const parsed = EmployeeUpdateSchema.safeParse(body)
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: current, error: currentError } = await fetchEmployeeDetail(supabase, id)

  if (currentError) {
    if (currentError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
  }

  if (!current) return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })

  const masterPayload = parsed.data
  let updatePayload = stripEmployeeMasterOnlyFields(masterPayload)
  const nextHistory = buildFieldHistory(current, updatePayload)
  let { data, error } = await supabase
    .from('employees')
    .update({
      ...updatePayload,
      field_history: nextHistory,
      ...(updatePayload.exit_date ? { work_status: 'terminated' as const } : {})
    })
    .eq('id', id)
    .select()
    .single()

  let missingColumn = missingEmployeeColumn(error, ['employment_contract_type', 'work_type', 'marital_status'])
  while (missingColumn) {
    updatePayload = { ...updatePayload }
    delete (updatePayload as Record<string, any>)[missingColumn]
    const retry = await supabase
      .from('employees')
      .update({
        ...updatePayload,
        field_history: buildFieldHistory(current, updatePayload),
        ...(updatePayload.exit_date ? { work_status: 'terminated' as const } : {})
      })
      .eq('id', id)
      .select()
      .single()
    data = retry.data
    error = retry.error
    missingColumn = missingEmployeeColumn(error, ['employment_contract_type', 'work_type', 'marital_status'])
  }

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'UPDATE_FAILED' }, { status: 500 })
  }

  const updatedEmployee = data as Record<string, any> | null
  if (!updatedEmployee) return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
  await syncMasterContact(supabase, 'person', updatedEmployee?.person_id || current.person_id, masterPayload)
  const hydrated = await hydrateMasterContact(supabase, 'person', updatedEmployee)
  return NextResponse.json({ data: hydrated })
}

// DELETE /api/employees/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId: id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('employees')
    .update({
      record_status: 'passive',
      employment_status: 'terminated',
      work_status: 'terminated',
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code || 'PASSIVATE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

function buildFieldHistory(current: Record<string, any>, updates: Record<string, any>) {
  const existingHistory = (current.field_history && typeof current.field_history === 'object') ? current.field_history : {}
  const nextHistory: Record<string, any[]> = { ...existingHistory }
  const ignored = new Set(['id', 'created_at', 'updated_at', 'field_history'])

  Object.entries(updates).forEach(([field, nextValue]) => {
    if (ignored.has(field)) return
    const previousValue = current[field]
    if (JSON.stringify(previousValue ?? null) === JSON.stringify(nextValue ?? null)) return

    nextHistory[field] = [
      ...(nextHistory[field] || []),
      {
        value: summarizeHistoryValue(previousValue),
        date: new Date().toISOString(),
        user: 'Sistem Kullanıcısı'
      }
    ]
  })

  return nextHistory
}

function summarizeHistoryValue(value: unknown) {
  if (typeof value === 'string' && value.startsWith('data:')) {
    return '[Medya dosyası]'
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, any>
    if (record.name && record.type) {
      return `${record.name} (${record.type})`
    }
  }

  return value ?? ''
}

function missingEmployeeColumn(error: { message?: string } | null, optionalColumns: string[]) {
  const message = error?.message || ''
  return optionalColumns.find((column) =>
    (message.includes(`employees.${column}`) && message.includes('does not exist')) ||
    (message.includes(`'${column}'`) && message.includes("'employees'") && message.includes('schema cache')) ||
    (message.includes(column) && message.includes('schema cache'))
  )
}
