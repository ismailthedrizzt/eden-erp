import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PersonelUpdateSchema = z.object({
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
  engellilik: z.boolean().optional(),
  hukumluluk: z.boolean().optional(),
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
  birim_id: z.string().uuid().optional().nullable(),
  kadro_id: z.string().uuid().optional().nullable(),
  ust_beden: z.string().optional(),
  alt_beden: z.string().optional(),
  ayakkabi: z.string().optional(),
  kep: z.string().optional(),
  iban: z.string().optional(),
  notlar: z.string().optional(),
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
    .from('personel')
    .select(selectQuery)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
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
  const parsed = PersonelUpdateSchema.safeParse(body)
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Geçersiz veri', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('personel')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
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
    .from('personel')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
