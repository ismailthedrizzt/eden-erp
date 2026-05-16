import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const IslemUpdateSchema = z.object({
  tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gelir: z.number().min(0).optional(),
  gider: z.number().min(0).optional(),
  aciklama: z.string().min(1).max(500).optional(),
  proje: z.enum(['PG', 'EPIRB', 'Otel', 'İdari', 'Sermaye', 'Aktarım', 'Finansal', 'Destek', 'Yatırım']).optional(),
  belge_no: z.string().optional(),
  islem_tarafi: z.enum(['Eden', 'İsmail ILGAR', 'Canberk', 'Ergün']).optional(),
  karsi_taraf: z.string().optional(),
  banka: z.string().optional(),
  hesap_tipi: z.enum(['Vadesiz', 'Yatırım', 'Kredi Kartı', 'Nakit', 'Bonus']).optional(),
  hesap_no: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const parsed = IslemUpdateSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json({ error: 'Gecersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.gelir === 0 && parsed.data.gider === 0) {
    return NextResponse.json({ error: 'Gelir veya gider girilmelidir.', code: 'INVALID_AMOUNT' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cash_transactions')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Islem bulunamadi', code: 'TRANSACTION_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'UPDATE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('cash_transactions')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code || 'DELETE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
