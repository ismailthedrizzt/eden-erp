import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const optionalText = z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().optional()
)

const CompanyPayloadSchema = z.object({
  trade_name: z.string().trim().min(2, 'Ticari unvan zorunludur.'),
  short_name: optionalText,
  tax_number: z.string().trim().regex(/^\d{10}$/, 'VKN 10 haneli olmalıdır.'),
  tax_office: z.string().trim().min(2, 'Vergi dairesi zorunludur.'),
  company_type: z.string().trim().min(2, 'Şirket türü zorunludur.'),
  country: z.string().trim().default('TR'),
  city: z.string().trim().min(2, 'İl zorunludur.'),
  district: z.string().trim().min(2, 'İlçe zorunludur.'),
  address: z.string().trim().min(5, 'Adres zorunludur.'),
})

const PersonRolePayloadSchema = z.object({
  company_id: z.string().uuid('Şirket kaydı bulunamadı.'),
  role: z.enum(['partner', 'employee']),
  first_name: z.string().trim().min(2, 'Ad zorunludur.'),
  last_name: z.string().trim().min(2, 'Soyad zorunludur.'),
  nationality: z.string().trim().default('TR'),
  national_id: z.string().trim().regex(/^\d{11}$/, 'TC kimlik no 11 haneli olmalıdır.'),
  gender: z.enum(['male', 'female']),
  email: optionalText,
  phone: optionalText,
})

const RequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create_company'), company: CompanyPayloadSchema }),
  z.object({ action: z.literal('create_person_role'), person: PersonRolePayloadSchema }),
])

type Supabase = ReturnType<typeof createServiceClient>

export async function GET() {
  const supabase = createServiceClient()
  const company = await fetchFirstCompany(supabase)
  return NextResponse.json({
    data: {
      has_company: Boolean(company),
      company,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const parsed = RequestSchema.parse(await request.json())
    const supabase = createServiceClient()

    if (parsed.action === 'create_company') {
      const result = await createFirstCompany(supabase, parsed.company)
      return NextResponse.json({ data: result }, { status: result.reused ? 200 : 201 })
    }

    const result = await createPersonRole(supabase, parsed.person)
    return NextResponse.json({ data: result }, { status: result.reused ? 200 : 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Form verileri geçersiz.', details: error.flatten() },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Kurulum adımı tamamlanamadı.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function createFirstCompany(supabase: Supabase, payload: z.infer<typeof CompanyPayloadSchema>) {
  const existing = await fetchFirstCompany(supabase)
  if (existing) return { company: existing, reused: true }

  const organization = await findOrCreateOrganization(supabase, payload)
  const companyPayload = {
    organization_id: organization.id,
    trade_name: payload.trade_name,
    short_name: payload.short_name || null,
    tax_number: payload.tax_number,
    tax_office: payload.tax_office,
    company_type: payload.company_type,
    country: payload.country || 'TR',
    city: payload.city,
    district: payload.district,
    address: payload.address,
    default_currency: 'TRY',
    default_language: 'tr',
    time_zone: 'Europe/Istanbul',
    fiscal_year_start: 1,
    is_deleted: false,
    hero_images: [],
    hero_documents: [],
    field_history: {},
  }

  const { data, error } = await supabase
    .from('companies')
    .insert(companyPayload)
    .select('id, organization_id, trade_name, short_name, tax_number, tax_office, company_type, country, city, district, address')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('İlk şirket kaydı oluşturulamadı.')

  const rootUnitError = await ensureCompanyRootUnit(supabase, data.id, data)
  if (rootUnitError && !isMissingTableError(rootUnitError)) throw new Error(rootUnitError.message)

  return { company: data, reused: false }
}

async function createPersonRole(supabase: Supabase, payload: z.infer<typeof PersonRolePayloadSchema>) {
  const company = await fetchCompanyById(supabase, payload.company_id)
  if (!company) throw new Error('Rol bağlanacak şirket kaydı bulunamadı.')

  const person = await findOrCreatePerson(supabase, payload)

  if (payload.role === 'partner') {
    const partner = await findOrCreatePartner(supabase, company.id, person, payload)
    return { person, role: 'partner', role_record: partner.record, reused: partner.reused }
  }

  const employee = await findOrCreateEmployee(supabase, company.id, person, payload)
  return { person, role: 'employee', role_record: employee.record, reused: employee.reused }
}

async function fetchFirstCompany(supabase: Supabase) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, organization_id, trade_name, short_name, tax_number, tax_office, company_type, country, city, district, address')
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error && !isMissingTableError(error)) throw new Error(error.message)
  return data || null
}

async function fetchCompanyById(supabase: Supabase, companyId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, trade_name')
    .eq('id', companyId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data || null
}

async function findOrCreateOrganization(supabase: Supabase, payload: z.infer<typeof CompanyPayloadSchema>) {
  const { data: existing, error: findError } = await supabase
    .from('organizations')
    .select('id')
    .eq('country', payload.country || 'TR')
    .eq('tax_number', payload.tax_number)
    .eq('is_deleted', false)
    .maybeSingle()

  if (findError && !isMissingTableError(findError)) throw new Error(findError.message)
  if (existing?.id) return existing

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      legal_name: payload.trade_name,
      trade_name: payload.trade_name,
      short_name: payload.short_name || null,
      country: payload.country || 'TR',
      tax_number: payload.tax_number,
      tax_office: payload.tax_office,
      organization_type: payload.company_type,
      address: payload.address,
      city: payload.city,
      district: payload.district,
      status: 'active',
      is_deleted: false,
      metadata_json: { source: 'setup_wizard' },
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Ana kurum kaydı oluşturulamadı.')
  return data
}

async function ensureCompanyRootUnit(supabase: Supabase, companyId: string, companyData: Record<string, any>) {
  const { data: unitType, error: typeError } = await supabase
    .from('organization_unit_types')
    .upsert(
      { name: 'Şirket', slug: 'company', color: '#0f766e', icon: 'Building2', sort_order: 0, is_active: true },
      { onConflict: 'slug' }
    )
    .select('id')
    .single()

  if (typeError) return typeError

  const { data: existing, error: findError } = await supabase
    .from('organization_units')
    .select('id')
    .eq('company_id', companyId)
    .is('parent_unit_id', null)
    .eq('type', 'company')
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()

  if (findError) return findError

  const rootPayload = {
    company_id: companyId,
    parent_unit_id: null,
    name: companyData.trade_name || companyData.short_name || 'Şirket',
    short_name: companyData.short_name || null,
    type: 'company',
    unit_type_id: unitType?.id || null,
    status: 'Aktif',
    active: true,
    is_deleted: false,
  }

  const result = existing?.id
    ? await supabase.from('organization_units').update(rootPayload).eq('id', existing.id)
    : await supabase.from('organization_units').insert(rootPayload)

  return result.error
}

async function findOrCreatePerson(supabase: Supabase, payload: z.infer<typeof PersonRolePayloadSchema>) {
  const nationality = payload.nationality || 'TR'
  const { data: existing, error: findError } = await supabase
    .from('persons')
    .select('id, first_name, last_name, full_name, national_id, nationality, gender, phone, email')
    .eq('nationality', nationality)
    .eq('national_id', payload.national_id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (findError) throw new Error(findError.message)
  if (existing?.id) return existing

  const fullName = [payload.first_name, payload.last_name].join(' ').trim()
  const { data, error } = await supabase
    .from('persons')
    .insert({
      first_name: payload.first_name,
      last_name: payload.last_name,
      full_name: fullName,
      nationality,
      national_id: payload.national_id,
      gender: payload.gender,
      phone: payload.phone || null,
      email: payload.email || null,
      status: 'active',
      is_deleted: false,
      metadata_json: { source: 'setup_wizard' },
    })
    .select('id, first_name, last_name, full_name, national_id, nationality, gender, phone, email')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Gerçek kişi kaydı oluşturulamadı.')
  return data
}

async function findOrCreatePartner(
  supabase: Supabase,
  companyId: string,
  person: Record<string, any>,
  payload: z.infer<typeof PersonRolePayloadSchema>
) {
  const { data: existing, error: findError } = await supabase
    .from('company_partners')
    .select('id, company_id, person_id, display_name, status')
    .eq('company_id', companyId)
    .eq('person_id', person.id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (findError) throw new Error(findError.message)
  if (existing?.id) return { record: existing, reused: true }

  const displayName = person.full_name || [payload.first_name, payload.last_name].join(' ').trim()
  const { data, error } = await supabase
    .from('company_partners')
    .insert({
      company_id: companyId,
      person_id: person.id,
      first_name: payload.first_name,
      last_name: payload.last_name,
      owner_kind: 'person',
      partner_type: 'person',
      source_type: 'setup_wizard',
      source_id: person.id,
      display_name: displayName,
      partner_name: displayName,
      identity_number: payload.national_id,
      status: 'active',
      record_status: 'active',
      start_date: new Date().toISOString().slice(0, 10),
      history: [{ type: 'setup_wizard_created', at: new Date().toISOString() }],
    })
    .select('id, company_id, person_id, display_name, status')
    .single()

  if (error) throw new Error(error.message)
  await insertPartnerLifecycleEvent(supabase, data?.id, companyId, payload)
  return { record: data, reused: false }
}

async function findOrCreateEmployee(
  supabase: Supabase,
  companyId: string,
  person: Record<string, any>,
  payload: z.infer<typeof PersonRolePayloadSchema>
) {
  const { data: existing, error: findError } = await supabase
    .from('employees')
    .select('id, company_id, person_id, first_name, last_name, record_status, work_status')
    .eq('company_id', companyId)
    .eq('person_id', person.id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (findError) throw new Error(findError.message)
  if (existing?.id) return { record: existing, reused: true }

  const today = new Date().toISOString().slice(0, 10)
  const employeeNo = await nextEmployeeNo(supabase)
  const { data, error } = await supabase
    .from('employees')
    .insert({
      person_id: person.id,
      company_id: companyId,
      employee_no: employeeNo,
      first_name: payload.first_name,
      last_name: payload.last_name,
      nationality: payload.nationality || 'TR',
      national_id: payload.national_id,
      gender: payload.gender,
      mobile_phone: payload.phone || null,
      email: payload.email || null,
      work_status: 'active',
      employment_status: 'active',
      record_status: 'active',
      start_date: today,
      sgk_entry_date: today,
      field_history: {},
      is_deleted: false,
    })
    .select('id, company_id, person_id, first_name, last_name, record_status, work_status')
    .single()

  if (error) throw new Error(error.message)
  await insertEmployeeWorkRelation(supabase, data?.id, companyId, today)
  return { record: data, reused: false }
}

async function nextEmployeeNo(supabase: Supabase) {
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })

  return `EMP-${String((count || 0) + 1).padStart(4, '0')}`
}

async function insertPartnerLifecycleEvent(
  supabase: Supabase,
  partnerId: string | undefined,
  companyId: string,
  payload: z.infer<typeof PersonRolePayloadSchema>
) {
  if (!partnerId) return

  const { error } = await supabase
    .from('partner_ownership_lifecycle_events')
    .insert({
      partner_id: partnerId,
      company_id: companyId,
      event_type: 'setup_wizard_partner_created',
      event_date: new Date().toISOString().slice(0, 10),
      old_status: null,
      new_status: 'active',
      payload: {
        first_name: payload.first_name,
        last_name: payload.last_name,
        national_id: payload.national_id,
      },
    })

  if (error && !isMissingTableError(error)) throw new Error(error.message)
}

async function insertEmployeeWorkRelation(
  supabase: Supabase,
  employeeId: string | undefined,
  companyId: string,
  startDate: string
) {
  if (!employeeId) return

  const { error } = await supabase
    .from('employee_work_relations')
    .insert({
      employee_id: employeeId,
      company_id: companyId,
      relation_type: 'primary',
      start_date: startDate,
      status: 'active',
      history: [{ type: 'setup_wizard_created', at: new Date().toISOString() }],
    })

  if (error && !isMissingTableError(error)) throw new Error(error.message)
}

function isMissingTableError(error: { message?: string; code?: string } | null) {
  const message = error?.message || ''
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('schema cache')
}
