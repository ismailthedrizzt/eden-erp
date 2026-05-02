import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SirketSchema = z.object({
  ticari_unvan: z.string().min(1).max(300),
  kisa_unvan: z.string().min(1).max(120),
  vkn_tckn: z.string().regex(/^\d{10,11}$/, 'VKN/TCKN 10 veya 11 haneli sayı olmalıdır'),
  vergi_dairesi: z.string().min(1).max(120),
  mersis_no: z.string().optional(),
  ticaret_sicil_no: z.string().optional(),
  kurulus_tarihi: z.string().optional(),
  sirket_turu: z.enum(['anonim', 'limited', 'sahis', 'kooperatif', 'diger']).optional(),
  ulke: z.string().min(1).default('Türkiye'),
  il: z.string().min(1).max(120),
  ilce: z.string().min(1).max(120),
  adres: z.string().min(1),
  telefon: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  web_sitesi: z.string().optional(),
  legal_entity: z.string().optional(),
  parent_company_id: z.string().uuid().optional().nullable(),
  sirket_kodu: z.string().optional(),
  e_fatura_mukellefi: z.boolean().default(false),
  e_arsiv_mukellefi: z.boolean().default(false),
  e_irsaliye_mukellefi: z.boolean().default(false),
  sgk_is_yeri_sicil_no: z.string().optional(),
  sgk_il: z.string().optional(),
  sgk_sube: z.string().optional(),
  nace_kodlari: z.array(z.string()).optional(),
  tehlike_sinifi: z.enum(['az_tehlikeli', 'tehlikeli', 'cok_tehlikeli']).optional(),
  varsayilan_para_birimi: z.string().default('TRY'),
  varsayilan_dil: z.string().default('tr'),
  zaman_dilimi: z.string().default('Europe/Istanbul'),
  mali_yil_baslangici: z.number().int().min(1).max(12).default(1),
  is_active: z.boolean().default(true),
})

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  )
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)

  const ara = searchParams.get('ara')
  const isActive = searchParams.get('is_active')

  let query = supabase
    .from('sirketler')
    .select('*')
    .order('kisa_unvan', { ascending: true })

  if (ara) {
    query = query.or(`kisa_unvan.ilike.%${ara}%,ticari_unvan.ilike.%${ara}%,vkn_tckn.ilike.%${ara}%`)
  }

  if (isActive === 'true') query = query.eq('is_active', true)
  if (isActive === 'false') query = query.eq('is_active', false)

  const { data, error } = await query
  if (error) {
    if (error.message.includes("Could not find the table 'public.sirketler'")) {
      return NextResponse.json({
        data: [],
        warning: 'sirketler tablosu bulunamadı. supabase/migrations/20240501_create_sirketler_table.sql uygulanmalı.'
      })
    }

    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = omitNullishValues(await request.json())
  const parsed = SirketSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sirketler')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
