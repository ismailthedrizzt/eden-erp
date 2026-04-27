import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/ik/teskilat  →  { birimler, kadrolar }
export async function GET() {
  const supabase = await createClient()

  const [{ data: birimler, error: e1 }, { data: kadrolar, error: e2 }] = await Promise.all([
    supabase.from('birimler').select('*').order('ad'),
    supabase.from('norm_kadrolar').select('*, personel:personel(id,ad,soyad)').order('unvan'),
  ])

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  return NextResponse.json({ birimler, kadrolar })
}

// POST /api/ik/teskilat  →  Yeni birim ekle
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('birimler')
    .insert({
      sirket_id:    body.sirket_id,
      ust_birim_id: body.ust_birim_id ?? null,
      ad:           body.ad,
      tip:          body.tip ?? 'departman',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
