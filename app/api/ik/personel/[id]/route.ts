import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { hydrateMasterContact, syncMasterContact } from '@/lib/identity/masterContact'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'

const EmployeeUpdateSchema = z.object({
  ad: z.string().min(1).max(100).optional(),
  soyad: z.string().min(1).max(100).optional(),
  uyruk: z.string().optional().transform(value => value ? normalizeCountryId(value) : value),
  tc_kimlik: z.string().regex(/^\d{11}$/, 'TC Kimlik No 11 haneli sayı olmalıdır').optional(),
  pasaport_no: z.string().optional(),
  cinsiyet: z.enum(['erkek', 'kadin']).optional(),
  dogum_yeri: z.string().optional(),
  dogum_tarihi: z.string().optional(),
  occupation: z.string().optional(),
  profession: z.string().optional(),
  meslek: z.string().optional(),
  kan_grubu: z.string().optional(),
  askerlik_durumu: z.string().optional(),
  tecil_tarihi: z.string().optional(),
  engellilik: z.boolean().optional(),
  engellilik_yuzdesi: z.coerce.number().min(0).max(100).optional().nullable(),
  hukumluluk: z.boolean().optional(),
  telefonlar: z.array(z.record(z.any())).optional(),
  epostalar: z.array(z.record(z.any())).optional(),
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
  calisma_durumu: z.enum(['gorevde', 'izinde', 'ayrilmis', 'askida']).optional(),
  calisma_tipi: z.string().optional(),
  is_akdi_bicimi: z.string().optional(),
  medeni_durum: z.enum(['bekar', 'evli']).optional(),
  sirket_id: z.string().uuid().optional().nullable(),
  birim_id: z.string().uuid().optional().nullable(),
  kadro_id: z.string().uuid().optional().nullable(),
  gorev: z.string().optional(),
  okuryazar_degil: z.boolean().optional(),
  egitim_okullari: z.array(z.record(z.any())).optional(),
  yabanci_diller: z.array(z.record(z.any())).optional(),
  sertifikalar: z.array(z.record(z.any())).optional(),
  yakinlar: z.array(z.record(z.any())).optional(),
  ise_giris_belgeleri: z.array(z.record(z.any())).optional(),
  isten_cikis_belgeleri: z.array(z.record(z.any())).optional(),
  ust_beden: z.string().optional(),
  alt_beden: z.string().optional(),
  ayakkabi: z.string().optional(),
  kep: z.string().optional(),
  iban: z.string().optional(),
  notlar: z.string().optional(),
  fotograf_url: z.string().optional(),
  cv_belgesi: z.record(z.any()).optional().nullable(),
  diploma_belgesi: z.record(z.any()).optional().nullable(),
  is_deleted: z.boolean().optional(),
})

function omitNullishValues(value: Record<string, any>) {
  const nullableFields = new Set(['cv_belgesi', 'diploma_belgesi'])

  return Object.fromEntries(
    Object.entries(value).filter(([key, item]) => nullableFields.has(key) || (item !== null && item !== undefined))
  )
}

const baseEmployeeDetailColumns = [
  'id',
  'person_id',
  'ad',
  'soyad',
  'uyruk',
  'tc_kimlik',
  'pasaport_no',
  'cinsiyet',
  'dogum_yeri',
  'dogum_tarihi',
  'kan_grubu',
  'askerlik_durumu',
  'tecil_tarihi',
  'engellilik',
  'engellilik_yuzdesi',
  'hukumluluk',
  'telefonlar',
  'epostalar',
  'cep_telefonu',
  'is_telefonu',
  'email',
  'adres',
  'il',
  'ilce',
  'acil_kisi_ad',
  'acil_kisi_soyad',
  'acil_kisi_yakinlik',
  'acil_kisi_telefon',
  'sgk_giris',
  'isten_ayrilis',
  'calisma_durumu',
  'sirket_id',
  'birim_id',
  'kadro_id',
  'gorev',
  'okuryazar_degil',
  'egitim_okullari',
  'yabanci_diller',
  'sertifikalar',
  'yakinlar',
  'ise_giris_belgeleri',
  'isten_cikis_belgeleri',
  'ust_beden',
  'alt_beden',
  'ayakkabi',
  'kep',
  'iban',
  'notlar',
  'fotograf_url',
  'cv_belgesi',
  'diploma_belgesi',
  'field_history',
  'created_at',
  'updated_at',
]

const employeeHeroColumns = [
  'id',
  'person_id',
  'ad',
  'soyad',
  'uyruk',
  'tc_kimlik',
  'pasaport_no',
  'cinsiyet',
  'dogum_yeri',
  'dogum_tarihi',
  'kan_grubu',
  'gorev',
  'calisma_durumu',
  'sirket_id',
  'birim_id',
  'kadro_id',
  'created_at',
  'updated_at',
]

const employeeMediaColumns = [
  'id',
  'fotograf_url',
  'cv_belgesi',
  'diploma_belgesi',
  'updated_at',
]

const optionalEmployeeDetailColumns = [
  'is_deleted',
  'employee_no',
  'employment_status',
  'start_date',
  'calisma_tipi',
  'is_akdi_bicimi',
  'medeni_durum',
  'version',
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

// GET /api/ik/personel/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const section = new URL(request.url).searchParams.get('section')

  if (section === 'hero') {
    const { data, error } = await fetchEmployeeDetail(supabase, id, employeeHeroColumns, ['is_deleted', 'employee_no', 'employment_status', 'start_date'])
    if (error) return handleEmployeeDetailError(error)
    if (!data) return NextResponse.json({ error: 'Ã‡alÄ±ÅŸan bulunamadÄ±', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
    return NextResponse.json({ data })
  }

  if (section === 'media') {
    const { data, error } = await fetchEmployeeDetail(supabase, id, employeeMediaColumns, [])
    if (error) return handleEmployeeDetailError(error)
    if (!data) return NextResponse.json({ error: 'Ã‡alÄ±ÅŸan bulunamadÄ±', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
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

  const [birim, kadro] = await Promise.all([
    data.birim_id
      ? supabase.from('birimler').select('id, ad, tip').eq('id', data.birim_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    data.kadro_id
      ? supabase.from('norm_kadrolar').select('id, unvan').eq('id', data.kadro_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const relatedError = birim.error || kadro.error
  if (relatedError) {
    return NextResponse.json({
      error: relatedError.message,
      code: relatedError.code || 'RELATED_FETCH_FAILED',
    }, { status: 500 })
  }

  const hydrated = await hydrateMasterContact(supabase, 'person', {
    ...data,
    ...(birim.data ? { birim: birim.data } : {}),
    ...(kadro.data ? { kadro: kadro.data } : {}),
  })

  return NextResponse.json(
    { data: hydrated },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}

function handleEmployeeDetailError(error: any) {
  if (error.code === 'PGRST116') {
    return NextResponse.json({ error: 'Ã‡alÄ±ÅŸan bulunamadÄ±', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
}

const employeeMasterOnlyFields = ['occupation', 'profession', 'meslek']

function stripEmployeeMasterOnlyFields<T extends Record<string, any>>(payload: T) {
  const next = { ...payload }
  employeeMasterOnlyFields.forEach(field => {
    delete next[field]
  })
  return next
}

// PATCH /api/ik/personel/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
      ...(updatePayload.isten_ayrilis ? { calisma_durumu: 'ayrilmis' as const } : {})
    })
    .eq('id', id)
    .select()
    .single()

  let missingColumn = missingEmployeeColumn(error, ['is_akdi_bicimi', 'calisma_tipi', 'medeni_durum'])
  while (missingColumn) {
    updatePayload = { ...updatePayload }
    delete (updatePayload as Record<string, any>)[missingColumn]
    const retry = await supabase
      .from('employees')
      .update({
        ...updatePayload,
        field_history: buildFieldHistory(current, updatePayload),
        ...(updatePayload.isten_ayrilis ? { calisma_durumu: 'ayrilmis' as const } : {})
      })
      .eq('id', id)
      .select()
      .single()
    data = retry.data
    error = retry.error
    missingColumn = missingEmployeeColumn(error, ['is_akdi_bicimi', 'calisma_tipi', 'medeni_durum'])
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

// DELETE /api/ik/personel/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('employees')
    .update({
      is_deleted: true,
      calisma_durumu: 'ayrilmis',
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code || 'SOFT_DELETE_FAILED' }, { status: 500 })
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
