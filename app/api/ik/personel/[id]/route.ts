import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const EmployeeUpdateSchema = z.object({
  ad: z.string().min(1).max(100).optional(),
  soyad: z.string().min(1).max(100).optional(),
  uyruk: z.enum(['tc', 'yabanci']).optional(),
  tc_kimlik: z.string().optional(),
  pasaport_no: z.string().optional(),
  cinsiyet: z.enum(['erkek', 'kadin']).optional(),
  dogum_yeri: z.string().optional(),
  dogum_tarihi: z.string().optional(),
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
  medeni_durum: z.enum(['bekar', 'evli', 'dul', 'bosanmis']).optional(),
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
})

// GET /api/ik/personel/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check if teskilat module is active
  const { data: teskilatLicense } = await supabase
    .from('module_licenses')
    .select('is_active, environment')
    .eq('module_key', 'teskilat')
    .single()

  const isTeskilatActive = teskilatLicense?.is_active &&
    (teskilatLicense.environment === 'all' || teskilatLicense.environment === process.env.NODE_ENV)

  // Build select query based on teskilat module status
  let selectQuery = '*'
  if (isTeskilatActive) {
    selectQuery = `*,
      birim:birimler(id, ad, tip),
      kadro:norm_kadrolar(id, unvan)`
  }

  const { data, error } = await supabase
    .from('employees')
    .select(selectQuery)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// PATCH /api/ik/personel/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const body = await request.json()
  const parsed = EmployeeUpdateSchema.safeParse(body)
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: current, error: currentError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()

  if (currentError) {
    if (currentError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
  }

  const nextHistory = buildFieldHistory(current, parsed.data)
  const { data, error } = await supabase
    .from('employees')
    .update({
      ...parsed.data,
      field_history: nextHistory,
      ...(parsed.data.isten_ayrilis ? { calisma_durumu: 'ayrilmis' as const } : {})
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Çalışan bulunamadı', code: 'EMPLOYEE_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'UPDATE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ data })
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
    .update({ is_active: false })
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
