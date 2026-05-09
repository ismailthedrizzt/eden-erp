import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const EmployeeSchema = z.object({
  ad: z.string().min(1).max(100),
  soyad: z.string().min(1).max(100),
  uyruk: z.enum(['tc', 'yabanci']).default('tc'),
  tc_kimlik: z.string().regex(/^\d{11}$/, 'TC Kimlik No 11 haneli sayı olmalıdır').optional(),
  pasaport_no: z.string().optional(),
  cinsiyet: z.enum(['erkek', 'kadin']),
  dogum_yeri: z.string().optional(),
  dogum_tarihi: z.string().optional(),
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
})

function omitNullishStrings(value: Record<string, any>) {
  const nullableFields = new Set(['cv_belgesi'])

  return Object.fromEntries(
    Object.entries(value).filter(([key, item]) => nullableFields.has(key) || (item !== null && item !== undefined))
  )
}

// GET /api/ik/personel
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const birimId = searchParams.get('birim_id')
  const durum = searchParams.get('durum')
  const ara = searchParams.get('ara')

  // Check if teskilat module is active
  const { data: teskilatLicense } = await supabase
    .from('module_licenses')
    .select('is_active, environment')
    .eq('module_key', 'teskilat')
    .single()

  const isTeskilatActive = teskilatLicense?.is_active &&
    (teskilatLicense.environment === 'all' || teskilatLicense.environment === process.env.NODE_ENV)

  // Build select query based on teskilat module status
  let selectQuery = 'id,employee_no,ad,soyad,uyruk,tc_kimlik,pasaport_no,cinsiyet,dogum_tarihi,cep_telefonu,email,calisma_durumu,employment_status,start_date,sgk_giris,fotograf_url,sirket_id,birim_id,kadro_id,gorev,egitim_okullari,created_at,updated_at,version,sirket:sirketler(id,kisa_unvan,ticari_unvan)'
  if (isTeskilatActive) {
    selectQuery = `${selectQuery},
      birim:birimler(id, ad, tip),
      kadro:norm_kadrolar(id, unvan)`
  }

  let query = supabase
    .from('employees')
    .select(selectQuery)
    .eq('is_active', true)
    .order('soyad', { ascending: true })

  if (birimId && isTeskilatActive) query = query.eq('birim_id', birimId)
  if (durum) query = query.eq('calisma_durumu', durum)
  if (ara) query = query.or(`ad.ilike.%${ara}%,soyad.ilike.%${ara}%,tc_kimlik.ilike.%${ara}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data || []).map((row: any) => ({
    ...row,
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
    education_level: Array.isArray(row.egitim_okullari) ? row.egitim_okullari.find((school: any) => school?.derece || school?.okul_adi)?.derece || null : null,
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

  const { data, error } = await supabase
    .from('employees')
    .insert({
      ...parsed.data,
      calisma_durumu: parsed.data.isten_ayrilis ? 'ayrilmis' : parsed.data.calisma_durumu
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
