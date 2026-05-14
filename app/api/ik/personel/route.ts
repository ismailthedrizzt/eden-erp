import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isTurkishNationality, normalizeCountryId } from '@/lib/reference/country-nationalities'
import { hydrateMasterContact, syncMasterContact } from '@/lib/identity/masterContact'

const EmployeeSchema = z.object({
  person_id: z.string().uuid().optional().nullable(),
  employee_no: z.string().optional(),
  ad: z.string().min(1).max(100),
  soyad: z.string().min(1).max(100),
  uyruk: z.string().default('TR').transform(normalizeCountryId),
  tc_kimlik: z.string().regex(/^\d{11}$/, 'TC Kimlik No 11 haneli sayı olmalıdır').optional(),
  pasaport_no: z.string().optional(),
  cinsiyet: z.enum(['erkek', 'kadin']),
  dogum_yeri: z.string().optional(),
  dogum_tarihi: z.string().optional(),
  occupation: z.string().optional(),
  profession: z.string().optional(),
  meslek: z.string().optional(),
  kan_grubu: z.string().optional(),
  askerlik_durumu: z.string().optional(),
  tecil_tarihi: z.string().optional(),
  engellilik: z.boolean().default(false),
  engellilik_yuzdesi: z.coerce.number().min(0).max(100).optional(),
  hukumluluk: z.boolean().default(false),
  telefonlar: z.array(z.record(z.any())).default([]),
  epostalar: z.array(z.record(z.any())).default([]),
  cep_telefonu: z.string().optional(),
  is_telefonu: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  adres: z.string().optional(),
  il: z.string().optional(),
  ilce: z.string().optional(),
  acil_kisi_ad: z.string().optional(),
  acil_kisi_soyad: z.string().optional(),
  acil_kisi_yakinlik: z.string().optional(),
  acil_kisi_telefon: z.string().optional(),
  sgk_giris: z.string().optional(),
  isten_ayrilis: z.string().optional(),
  calisma_durumu: z.enum(['gorevde', 'izinde', 'ayrilmis', 'askida']).default('gorevde'),
  calisma_tipi: z.string().optional(),
  is_akdi_bicimi: z.string().optional(),
  medeni_durum: z.enum(['bekar', 'evli']).optional(),
  sirket_id: z.string().uuid().optional(),
  birim_id: z.string().uuid().optional(),
  kadro_id: z.string().uuid().optional(),
  gorev: z.string().optional(),
  okuryazar_degil: z.boolean().default(false),
  egitim_okullari: z.array(z.record(z.any())).default([]),
  yabanci_diller: z.array(z.record(z.any())).default([]),
  sertifikalar: z.array(z.record(z.any())).default([]),
  yakinlar: z.array(z.record(z.any())).default([]),
  ise_giris_belgeleri: z.array(z.record(z.any())).default([]),
  isten_cikis_belgeleri: z.array(z.record(z.any())).default([]),
  ust_beden: z.string().optional(),
  alt_beden: z.string().optional(),
  ayakkabi: z.string().optional(),
  kep: z.string().optional(),
  iban: z.string().optional(),
  notlar: z.string().optional(),
  fotograf_url: z.string().optional(),
  cv_belgesi: z.record(z.any()).optional().nullable(),
  diploma_belgesi: z.record(z.any()).optional().nullable(),
  is_deleted: z.boolean().default(false),
})

function omitNullishStrings(value: Record<string, any>) {
  const nullableFields = new Set(['cv_belgesi', 'diploma_belgesi'])

  return Object.fromEntries(
    Object.entries(value).filter(([key, item]) => nullableFields.has(key) || (item !== null && item !== undefined))
  )
}

const baseEmployeeListColumns = [
  'id',
  'ad',
  'soyad',
  'uyruk',
  'tc_kimlik',
  'pasaport_no',
  'cinsiyet',
  'dogum_tarihi',
  'cep_telefonu',
  'email',
  'calisma_durumu',
  'sgk_giris',
  'fotograf_url',
  'sirket_id',
  'birim_id',
  'kadro_id',
  'gorev',
  'created_at',
  'updated_at',
]

const optionalEmployeeListColumns = [
  'is_deleted',
  'employee_no',
  'employment_status',
  'start_date',
  'calisma_tipi',
  'is_akdi_bicimi',
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
    message.includes('birimler') ||
    message.includes('norm_kadrolar')
  )
}

const employeeMasterOnlyFields = ['occupation', 'profession', 'meslek']

function stripEmployeeMasterOnlyFields<T extends Record<string, any>>(payload: T) {
  const next = { ...payload }
  employeeMasterOnlyFields.forEach(field => {
    delete next[field]
  })
  return next
}

// GET /api/ik/personel
export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)

  const birimId = searchParams.get('birim_id')
  const durum = searchParams.get('durum')
  const ara = searchParams.get('ara')
  const includePassive = searchParams.get('include_passive') === 'true'

  let enabledOptionalColumns = [...optionalEmployeeListColumns]
  let includeOrganizationRelations = true
  let hasIsDeletedColumn = true
  let data: any[] | null = null
  let error: any = null

  while (true) {
    let selectQuery = [
      ...baseEmployeeListColumns,
      ...enabledOptionalColumns,
      'sirket:sirketler(id,kisa_unvan,ticari_unvan)',
    ].join(',')

    if (includeOrganizationRelations) {
      selectQuery = `${selectQuery},birim:birimler(id, ad, tip),kadro:norm_kadrolar(id, unvan)`
    }

    let query = supabase
      .from('employees')
      .select(selectQuery)
      .order('soyad', { ascending: true })

    if (!includePassive && hasIsDeletedColumn) query = query.or('is_deleted.eq.false,is_deleted.is.null')
    if (birimId) query = query.eq('birim_id', birimId)
    if (durum) query = query.eq('calisma_durumu', durum)
    if (ara) query = query.or(`ad.ilike.%${ara}%,soyad.ilike.%${ara}%,tc_kimlik.ilike.%${ara}%`)

    const result = await query
    data = result.data
    error = result.error

    const missingColumn = missingEmployeeColumn(error, enabledOptionalColumns)
    if (missingColumn) {
      enabledOptionalColumns = enabledOptionalColumns.filter((column) => column !== missingColumn)
      if (missingColumn === 'is_deleted') hasIsDeletedColumn = false
      continue
    }

    if (includeOrganizationRelations && missingEmployeeRelation(error)) {
      includeOrganizationRelations = false
      continue
    }

    break
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data || []).map((row: any) => ({
    ...row,
    is_deleted: row.is_deleted ?? false,
    employee_no: row.employee_no || null,
    photo_url: row.fotograf_url || null,
    full_name: [row.ad, row.soyad].filter(Boolean).join(' '),
    national_id: row.tc_kimlik || null,
    passport_no: row.pasaport_no || null,
    nationality: row.uyruk || null,
    company_name: row.sirket?.kisa_unvan || row.sirket?.ticari_unvan || null,
    department_name: row.birim?.ad || null,
    position_title: row.kadro?.unvan || row.gorev || null,
    hire_date: row.sgk_giris || row.start_date || null,
    employment_type: row.calisma_tipi || null,
    employment_status: row.employment_status || row.calisma_durumu || null,
    phone: row.cep_telefonu || null,
    gender: row.cinsiyet || null,
    birth_date: row.dogum_tarihi || null,
    education_level: null,
    sgk_status: row.sgk_giris ? 'active' : 'pending',
    status: row.calisma_durumu || null,
  }))
  return NextResponse.json({ data: rows })
}

// POST /api/ik/personel
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
      is_deleted: employeePayload.is_deleted ?? false,
      calisma_durumu: employeePayload.isten_ayrilis ? 'ayrilmis' : employeePayload.calisma_durumu
    })
    .select()
    .single()

  let missingMutationColumn = missingEmployeeColumn(error, ['is_akdi_bicimi', 'calisma_tipi', 'medeni_durum'])
  while (missingMutationColumn) {
    employeePayload = { ...employeePayload }
    delete (employeePayload as Record<string, any>)[missingMutationColumn]
    const retry = await supabase
      .from('employees')
      .insert({
        ...employeePayload,
        is_deleted: employeePayload.is_deleted ?? false,
        calisma_durumu: employeePayload.isten_ayrilis ? 'ayrilmis' : employeePayload.calisma_durumu
      })
      .select()
      .single()
    data = retry.data
    error = retry.error
    missingMutationColumn = missingEmployeeColumn(error, ['is_akdi_bicimi', 'calisma_tipi', 'medeni_durum'])
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

  const fullName = [employee.ad, employee.soyad].filter(Boolean).join(' ').trim()
  if (!fullName) return employee

  const nationality = normalizeCountryId(employee.uyruk)
  const nationalId = isTurkishNationality(nationality) ? employee.tc_kimlik || null : null
  const passportNo = isTurkishNationality(nationality) ? null : employee.pasaport_no || null

  const lookup = nationalId
    ? supabase.from('persons').select('id').eq('nationality', nationality).eq('national_id', nationalId).eq('is_deleted', false).maybeSingle()
    : passportNo
      ? supabase.from('persons').select('id').eq('nationality', nationality).eq('passport_no', passportNo).eq('is_deleted', false).maybeSingle()
      : null

  const existing = lookup ? await lookup : { data: null, error: null }
  if (isMissingTableError(existing.error, 'persons')) throw new Error('Ana kişiler tablosu bulunamadı; çalışan kaydı master bağlantısı olmadan oluşturulamaz.')
  if (existing.error) throw new Error(existing.error.message)
  if (existing.data?.id) return { ...employee, person_id: existing.data.id }

  const { data: created, error } = await supabase
    .from('persons')
    .insert({
      first_name: employee.ad,
      last_name: employee.soyad,
      full_name: fullName,
      nationality,
      national_id: nationalId,
      passport_no: passportNo,
      birth_date: employee.dogum_tarihi || null,
      birth_place: employee.dogum_yeri || null,
      gender: employee.cinsiyet || null,
      phone: employee.cep_telefonu || employee.is_telefonu || null,
      email: employee.email || null,
      address: employee.adres || null,
      city: employee.il || null,
      district: employee.ilce || null,
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
