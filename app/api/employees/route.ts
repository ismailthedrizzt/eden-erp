import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isTurkishNationality, normalizeCountryId } from '@/lib/reference/country-nationalities'
import { hydrateMasterContact, syncMasterContact } from '@/lib/identity/masterContact'
import { listMetaFromRows, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { getServerResponseCache, serverListCacheKey, setServerResponseCache } from '@/lib/api/serverResponseCache'
import { fetchCompanyNames } from '../accounting/_banking'

const EmployeeSchema = z.object({
  person_id: z.string().uuid().optional().nullable(),
  employee_no: z.string().optional(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  nationality: z.string().default('TR').transform(normalizeCountryId),
  national_id: z.string().regex(/^\d{11}$/, 'TC Kimlik No 11 haneli sayı olmalıdır').optional(),
  passport_no: z.string().optional(),
  gender: z.enum(['male', 'female']),
  birth_place: z.string().optional(),
  birth_date: z.string().optional(),
  occupation: z.string().optional(),
  blood_type: z.string().optional(),
  military_status: z.string().optional(),
  deferment_date: z.string().optional(),
  has_disability: z.boolean().default(false),
  disability_percentage: z.coerce.number().min(0).max(100).optional(),
  has_conviction: z.boolean().default(false),
  phones: z.array(z.record(z.any())).default([]),
  emails: z.array(z.record(z.any())).default([]),
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
  work_status: z.enum(['active', 'on_leave', 'terminated', 'suspended']).default('active'),
  work_type: z.string().optional(),
  employment_contract_type: z.string().optional(),
  marital_status: z.enum(['single', 'married']).optional(),
  company_id: z.string().uuid().optional(),
  unit_id: z.string().uuid().optional(),
  position_id: z.string().uuid().optional(),
  job_title: z.string().optional(),
  is_illiterate: z.boolean().default(false),
  education_schools: z.array(z.record(z.any())).default([]),
  foreign_languages: z.array(z.record(z.any())).default([]),
  certificates: z.array(z.record(z.any())).default([]),
  relatives: z.array(z.record(z.any())).default([]),
  entry_documents: z.array(z.record(z.any())).default([]),
  exit_documents: z.array(z.record(z.any())).default([]),
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

function omitNullishStrings(value: Record<string, any>) {
  const nullableFields = new Set(['cv_document', 'diploma_document'])

  return Object.fromEntries(
    Object.entries(value).filter(([key, item]) => nullableFields.has(key) || (item !== null && item !== undefined))
  )
}

const baseEmployeeListColumns = [
  'id',
  'person_id',
  'created_at',
  'updated_at',
]

const optionalEmployeeListColumns = [
  'nationality',
  'national_id',
  'passport_no',
  'gender',
  'birth_date',
  'mobile_phone',
  'email',
  'photo_url',
  'work_status',
  'sgk_entry_date',
  'company_id',
  'unit_id',
  'position_id',
  'job_title',
  'employee_no',
  'employment_status',
  'record_status',
  'entry_date',
  'start_date',
  'work_type',
  'employment_contract_type',
  'version',
]

function missingEmployeeColumn(error: { message?: string } | null, optionalColumns: string[]) {
  const message = error?.message || ''
  return optionalColumns.find((column) =>
    (message.includes(`employees.${column}`) && message.includes('does not exist')) ||
    (message.includes(`'${column}'`) && message.includes("'employees'") && message.includes('schema cache')) ||
    (message.includes(column) && message.includes('schema cache'))
  )
}

function missingEmployeeRelation(error: { code?: string; message?: string } | null) {
  const message = error?.message || ''
  return (
    error?.code === 'PGRST200' ||
    error?.code === 'PGRST201' ||
    message.includes('relationship') ||
    message.includes('schema cache') ||
    message.includes('organization_units') ||
    message.includes('positions')
  )
}

const employeeMasterOnlyFields = ['occupation']

function stripEmployeeMasterOnlyFields<T extends Record<string, any>>(payload: T) {
  const next = { ...payload }
  employeeMasterOnlyFields.forEach(field => {
    delete next[field]
  })
  return next
}

// GET /api/employees
export async function GET(request: NextRequest) {
  const cacheKey = serverListCacheKey(request, 'employees:list')
  const cached = getServerResponseCache<Record<string, unknown>>(cacheKey)
  if (cached) return NextResponse.json(cached)

  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'updated_at', direction: 'desc' })
  const { from, to } = listRange(listQuery)
  const sortMap: Record<string, string> = {
    first_name: 'updated_at',
    last_name: 'updated_at',
    employee_no: 'updated_at',
    national_id: 'updated_at',
    work_status: 'work_status',
    created_at: 'created_at',
    updated_at: 'updated_at',
    company_id: 'updated_at',
    unit_id: 'updated_at',
    position_id: 'updated_at',
  }
  let sortColumn = sortMap[listQuery.sort || ''] || 'updated_at'

  const unitId = searchParams.get('unit_id')
  const status = searchParams.get('status')
  const search = listQuery.search
  const includePassive = listQuery.includePassive
  const matchingPersonIds = search ? await findPersonIds(supabase, search) : null

  let enabledOptionalColumns = [...optionalEmployeeListColumns]
  let includeOrganizationRelations = false
  let useLegacyEmployeeColumns = false
  let canFilterRecordStatus = true
  let canFilterWorkStatus = true
  let canFilterUnitId = true
  let data: any[] | null = null
  let error: any = null

  while (true) {
    let selectQuery = [
      ...baseEmployeeListColumns,
      ...enabledOptionalColumns,
    ].join(',')

    if (includeOrganizationRelations) {
      selectQuery = `${selectQuery},unit:organization_units(id, name, type),position:positions(id, title)`
    }

    let query = supabase
      .from('employees')
      .select(selectQuery)
      .order(sortColumn, { ascending: listQuery.direction !== 'desc' })
      .range(from, to)

    if (!includePassive && canFilterRecordStatus) query = query.neq('record_status', 'passive')
    if (unitId && canFilterUnitId) query = query.eq('unit_id', unitId)
    if (status && canFilterWorkStatus) query = query.eq('work_status', status)
    if (search && matchingPersonIds?.length) query = query.in('person_id', matchingPersonIds)
    if (search && matchingPersonIds && matchingPersonIds.length === 0) query = query.eq('person_id', '00000000-0000-0000-0000-000000000000')

    const result = await query
    data = result.data
    error = result.error

    const missingColumn = missingEmployeeColumn(error, [...enabledOptionalColumns, 'work_status', 'unit_id'])
    if (missingColumn) {
      if (missingColumn === 'record_status') canFilterRecordStatus = false
      if (missingColumn === 'work_status') canFilterWorkStatus = false
      if (missingColumn === 'unit_id') canFilterUnitId = false
      if (missingColumn === sortColumn) sortColumn = 'updated_at'
      if (!useLegacyEmployeeColumns && optionalEmployeeListColumns.includes(missingColumn)) {
        useLegacyEmployeeColumns = true
        enabledOptionalColumns = ['record_status']
        if (!baseEmployeeListColumns.includes(sortColumn)) sortColumn = 'updated_at'
        includeOrganizationRelations = false
        continue
      }
      enabledOptionalColumns = enabledOptionalColumns.filter((column) => column !== missingColumn)
      continue
    }

    if (includeOrganizationRelations && missingEmployeeRelation(error)) {
      includeOrganizationRelations = false
      continue
    }

    break
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const people = await fetchPeopleByIds(supabase, (data || []).map((row: any) => row.person_id))
  const companyNames = await fetchCompanyNames(supabase as any, (data || []).map((row: any) => row.company_id))
  const rows = (data || []).map((row: any) => {
    const personFields = employeePersonFields(row, people.get(row.person_id))
    return {
      ...row,
      ...personFields,
      employee_no: row.employee_no || null,
      photo_url: lightweightImageUrl(row.photo_url),
      national_id: personFields.national_id,
      passport_no: personFields.passport_no,
      nationality: personFields.nationality,
      company_name: row.company_id ? companyNames.get(row.company_id) || null : null,
      department_name: row.unit?.name || null,
      position_title: row.position?.title || row.job_title || null,
      hire_date: row.entry_date || row.sgk_entry_date || row.start_date || null,
      employment_type: row.work_type || null,
      employment_status: row.employment_status || row.work_status || null,
      record_status: row.record_status || (row.sgk_entry_date ? 'active' : 'draft'),
      phone: personFields.mobile_phone,
      gender: personFields.gender,
      birth_date: personFields.birth_date,
      education_level: null,
      sgk_status: row.sgk_entry_date ? 'active' : 'pending',
      status: row.work_status || null,
    }
  })
  const payload = { data: rows, meta: listMetaFromRows(listQuery, rows.length) }
  setServerResponseCache(cacheKey, payload, 60_000)
  return NextResponse.json(payload)
}

function lightweightImageUrl(value: unknown) {
  if (typeof value !== 'string') return null
  const photoUrl = value.trim()
  if (!photoUrl) return null
  if (photoUrl.startsWith('data:') && photoUrl.length > 20_000) return null
  return photoUrl
}

async function findPersonIds(supabase: ReturnType<typeof createServiceClient>, search: string) {
  const term = String(search || '').trim()
  if (!term) return []

  const { data, error } = await supabase
    .from('persons')
    .select('id')
    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,full_name.ilike.%${term}%,national_id.ilike.%${term}%,passport_no.ilike.%${term}%`)
    .limit(500)

  if (error) return null
  return (data || []).map((person: any) => person.id).filter(Boolean)
}

async function fetchPeopleByIds(supabase: ReturnType<typeof createServiceClient>, ids: unknown[]) {
  const personIds = Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0)))
  if (personIds.length === 0) return new Map<string, any>()

  const { data, error } = await supabase
    .from('persons')
    .select('id,first_name,last_name,full_name,nationality,national_id,passport_no,birth_date,gender,phone,email')
    .in('id', personIds)

  if (error) return new Map<string, any>()
  return new Map((data || []).map((person: any) => [person.id, person]))
}

function employeePersonFields(employee: Record<string, any>, person?: Record<string, any>) {
  const firstName = employee.first_name || person?.first_name || ''
  const lastName = employee.last_name || person?.last_name || ''
  const fullName = person?.full_name || [firstName, lastName].filter(Boolean).join(' ')
  return {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    display_name: fullName,
    nationality: employee.nationality || person?.nationality || null,
    national_id: employee.national_id || person?.national_id || null,
    passport_no: employee.passport_no || person?.passport_no || null,
    birth_date: employee.birth_date || person?.birth_date || null,
    gender: employee.gender || person?.gender || null,
    email: employee.email || person?.email || null,
    mobile_phone: employee.mobile_phone || person?.phone || null,
  }
}

// POST /api/employees
export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  const body = omitNullishStrings(await request.json())
  const parsed = EmployeeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const masterPayload = parsed.data
  let employeePayload = await ensureEmployeePersonLink(supabase, stripEmployeeMasterOnlyFields(masterPayload))

  let { data, error } = await supabase
    .from('employees')
    .insert({
      ...employeePayload,
      record_status: employeePayload.record_status || 'draft',
      employment_status: employeePayload.employment_status || 'pending_entry',
      work_status: employeePayload.exit_date ? 'terminated' : employeePayload.work_status || 'suspended'
    })
    .select()
    .single()

  let missingMutationColumn = missingEmployeeColumn(error, Object.keys(employeePayload))
  while (missingMutationColumn) {
    employeePayload = { ...employeePayload }
    delete (employeePayload as Record<string, any>)[missingMutationColumn]
    const retry = await supabase
      .from('employees')
      .insert({
        ...employeePayload,
        record_status: employeePayload.record_status || 'draft',
        employment_status: employeePayload.employment_status || 'pending_entry',
        work_status: employeePayload.exit_date ? 'terminated' : employeePayload.work_status || 'suspended'
      })
      .select()
      .single()
    data = retry.data
    error = retry.error
    missingMutationColumn = missingEmployeeColumn(error, Object.keys(employeePayload))
  }

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
  await syncMasterContact(supabase, 'person', data?.person_id || employeePayload.person_id, {
    ...masterPayload,
    person_id: data?.person_id || employeePayload.person_id,
  })
  const hydrated = data?.person_id ? await hydrateMasterContact(supabase, 'person', data) : data
  return NextResponse.json({ data: hydrated }, { status: 201 })
}

async function ensureEmployeePersonLink(supabase: ReturnType<typeof createServiceClient>, employee: z.infer<typeof EmployeeSchema>) {
  if (employee.person_id) return employee

  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim()
  if (!fullName) return employee

  const nationality = normalizeCountryId(employee.nationality)
  const nationalId = isTurkishNationality(nationality) ? employee.national_id || null : null
  const passportNo = isTurkishNationality(nationality) ? null : employee.passport_no || null

  const lookup = nationalId
    ? supabase.from('persons').select('id').eq('nationality', nationality).eq('national_id', nationalId).maybeSingle()
    : passportNo
      ? supabase.from('persons').select('id').eq('nationality', nationality).eq('passport_no', passportNo).maybeSingle()
      : null

  const existing = lookup ? await lookup : { data: null, error: null }
  if (isMissingTableError(existing.error, 'persons')) throw new Error('Ana kişiler tablosu bulunamadı; çalışan kaydı master bağlantısı olmadan oluşturulamaz.')
  if (existing.error) throw new Error(existing.error.message)
  if (existing.data?.id) return { ...employee, person_id: existing.data.id }

  const { data: created, error } = await supabase
    .from('persons')
    .insert({
      first_name: employee.first_name,
      last_name: employee.last_name,
      full_name: fullName,
      nationality,
      national_id: nationalId,
      passport_no: passportNo,
      birth_date: employee.birth_date || null,
      birth_place: employee.birth_place || null,
      gender: employee.gender || null,
      phone: employee.mobile_phone || employee.work_phone || null,
      email: employee.email || null,
      address: employee.address || null,
      city: employee.city || null,
      district: employee.district || null,
      metadata_json: { source_table: 'employees', source: 'identity_gate' },
    })
    .select('id')
    .single()

  if (isMissingTableError(error, 'persons')) throw new Error('Ana kişiler tablosu bulunamadı; çalışan kaydı master bağlantısı olmadan oluşturulamaz.')
  if (error) throw new Error(error.message)
  return created?.id ? { ...employee, person_id: created.id } : employee
}

function isMissingTableError(error: { message?: string; code?: string } | null, tableName: string) {
  const message = error?.message || ''
  return error?.code === 'PGRST205' || message.includes(`'public.${tableName}'`) || message.includes(`table '${tableName}'`) || message.includes('schema cache')
}
