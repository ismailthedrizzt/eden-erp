import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const IslemSchema = z.object({
  tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gelir: z.number().min(0).default(0),
  gider: z.number().min(0).default(0),
  aciklama: z.string().min(1).max(500),
  proje: z.enum(['PG', 'EPIRB', 'Otel', 'İdari', 'Sermaye', 'Aktarım', 'Finansal', 'Destek', 'Yatırım']),
  belge_no: z.string().optional(),
  islem_tarafi: z.enum(['Eden', 'İsmail ILGAR', 'Canberk', 'Ergün']),
  karsi_taraf: z.string().optional(),
  banka: z.string().optional(),
  hesap_tipi: z.enum(['Vadesiz', 'Yatırım', 'Kredi Kartı', 'Nakit', 'Bonus']).optional(),
  hesap_no: z.string().optional(),
})

// GET /api/muhasebe/islemler
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const islemTarafi = searchParams.get('islem_tarafi')
  const proje = searchParams.get('proje')
  const tip = searchParams.get('tip') // 'gelir' | 'gider'
  const ara = searchParams.get('ara')
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '50')

  let query = supabase
    .from('nakit_islemler')
    .select('*', { count: 'exact' })
    .order('tarih', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (islemTarafi) query = query.eq('islem_tarafi', islemTarafi)
  if (proje) query = query.eq('proje', proje)
  if (tip === 'gelir') query = query.gt('gelir', 0)
  if (tip === 'gider') query = query.gt('gider', 0)
  if (ara) query = query.or(`aciklama.ilike.%${ara}%,karsi_taraf.ilike.%${ara}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  })
}

// POST /api/muhasebe/islemler
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const body = await request.json()
  const parsed = IslemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', details: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.gelir === 0 && parsed.data.gider === 0) {
    return NextResponse.json({ error: 'Gelir veya gider girilmelidir.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('nakit_islemler')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
