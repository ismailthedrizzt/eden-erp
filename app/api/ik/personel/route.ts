import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PersonelSchema = z.object({
  ad: z.string().min(1).max(100),
  soyad: z.string().min(1).max(100),
  uyruk: z.enum(['tc', 'yabanci']).default('tc'),
  tc_kimlik: z.string().optional(),
  pasaport_no: z.string().optional(),
  cinsiyet: z.enum(['erkek', 'kadin']),
  dogum_yeri: z.string().optional(),
  dogum_tarihi: z.string().optional(),
  kan_grubu: z.string().optional(),
  askerlik_durumu: z.string().optional(),
  engellilik: z.boolean().default(false),
  hukumluluk: z.boolean().default(false),
  cep_telefonu: z.string().optional(),
  is_telefonu: z.string().optional(),
  email: z.string().email().optional(),
  adres: z.string().optional(),
  il: z.string().optional(),
  ilce: z.string().optional(),
  acil_kisi_ad: z.string().optional(),
  acil_kisi_soyad: z.string().optional(),
  acil_kisi_yakinlik: z.string().optional(),
  acil_kisi_telefon: z.string().optional(),
  sgk_giris: z.string().optional(),
  calisma_durumu: z.enum(['gorevde', 'izinde', 'ayrilmis', 'askida']).default('gorevde'),
  birim_id: z.string().uuid().optional(),
  kadro_id: z.string().uuid().optional(),
  ust_beden: z.string().optional(),
  alt_beden: z.string().optional(),
  ayakkabi: z.string().optional(),
  kep: z.string().optional(),
  iban: z.string().optional(),
  notlar: z.string().optional(),
})

// GET /api/ik/personel
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const birimId = searchParams.get('birim_id')
  const durum = searchParams.get('durum')
  const ara = searchParams.get('ara')

  let query = supabase
    .from('personel')
    .select(`
      *,
      birim:birimler(id, ad, tip),
      kadro:norm_kadrolar(id, unvan)
    `)
    .order('soyad', { ascending: true })

  if (birimId) query = query.eq('birim_id', birimId)
  if (durum) query = query.eq('calisma_durumu', durum)
  if (ara) query = query.or(`ad.ilike.%${ara}%,soyad.ilike.%${ara}%,tc_kimlik.ilike.%${ara}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/ik/personel
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const body = await request.json()
  const parsed = PersonelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('personel')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
