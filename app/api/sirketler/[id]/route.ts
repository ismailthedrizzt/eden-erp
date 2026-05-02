import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SirketUpdateSchema = z.object({
  ticari_unvan: z.string().min(1).max(300).optional(),
  kisa_unvan: z.string().min(1).max(120).optional(),
  vkn_tckn: z.string().regex(/^\d{10}$/, 'VKN 10 haneli sayı olmalıdır').optional(),
  vergi_dairesi: z.string().min(1).max(120).optional(),
  mersis_no: z.string().optional(),
  ticaret_sicil_no: z.string().optional(),
  kurulus_tarihi: z.string().optional(),
  sirket_turu: z.enum(['anonim', 'limited', 'komandit', 'kolektif', 'adi_komandit', 'adi_sirket']).optional(),
  ulke: z.string().min(1).optional(),
  il: z.string().min(1).max(120).optional(),
  ilce: z.string().min(1).max(120).optional(),
  adres: z.string().min(1).optional(),
  telefon: z.string().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  web_sitesi: z.string().optional(),
  legal_entity: z.string().optional(),
  parent_company_id: z.string().uuid().optional().nullable(),
  sirket_kodu: z.string().optional(),
  e_fatura_mukellefi: z.boolean().optional(),
  e_arsiv_mukellefi: z.boolean().optional(),
  e_irsaliye_mukellefi: z.boolean().optional(),
  sgk_is_yeri_sicil_no: z.string().optional(),
  sgk_il: z.string().optional(),
  sgk_sube: z.string().optional(),
  nace_kodlari: z.array(z.string()).optional(),
  tehlike_sinifi: z.enum(['az_tehlikeli', 'tehlikeli', 'cok_tehlikeli']).optional(),
  varsayilan_para_birimi: z.string().optional(),
  varsayilan_dil: z.string().optional(),
  zaman_dilimi: z.string().optional(),
  mali_yil_baslangici: z.number().int().min(1).max(12).optional(),
  is_active: z.boolean().optional(),
  hero_images: z.array(z.record(z.any())).optional(),
  hero_documents: z.array(z.record(z.any())).optional(),
  ortaklar: z.array(z.record(z.any())).optional(),
})

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sirketler')
    .select(`
      *,
      ortaklar:sirket_ortaklar(*),
      temsilciler:sirket_temsilciler(*),
      dokumanlar:sirket_dokumanlar(*),
      logolar:sirket_logolar(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const body = omitNullishValues(await request.json())
  const parsed = SirketUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data: current, error: currentError } = await supabase
    .from('sirketler')
    .select('*')
    .eq('id', id)
    .single()

  if (currentError) {
    if (currentError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
  }

  const { ortaklar, ...companyUpdates } = parsed.data
  const nextHistory = buildFieldHistory(current, companyUpdates)
  const { data, error } = await supabase
    .from('sirketler')
    .update({
      ...companyUpdates,
      field_history: nextHistory,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message, code: error.code || 'UPDATE_FAILED' }, { status: 500 })
  }

  if (ortaklar) {
    const partnerError = await replaceCompanyPartners(supabase, id, ortaklar)
    if (partnerError) return NextResponse.json({ error: partnerError.message, code: partnerError.code || 'PARTNER_SAVE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('sirketler')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'SOFT_DELETE_FAILED' }, { status: 500 })

  return NextResponse.json({ success: true })
}

function buildFieldHistory(current: Record<string, any>, updates: Record<string, any>) {
  const existingHistory = (current.field_history && typeof current.field_history === 'object') ? current.field_history : {}
  const nextHistory: Record<string, any[]> = { ...existingHistory }
  const ignored = new Set(['id', 'created_at', 'updated_at', 'created_by', 'field_history'])

  Object.entries(updates).forEach(([field, nextValue]) => {
    if (ignored.has(field)) return
    const previousValue = current[field]
    if (JSON.stringify(previousValue ?? null) === JSON.stringify(nextValue ?? null)) return

    nextHistory[field] = [
      ...(nextHistory[field] || []),
      {
        value: previousValue ?? '',
        date: new Date().toISOString(),
        user: 'Sistem Kullanıcısı',
      },
    ]
  })

  return nextHistory
}

async function replaceCompanyPartners(supabase: ReturnType<typeof createServiceClient>, sirketId: string, partners: Record<string, any>[]) {
  const deleteResult = await supabase
    .from('sirket_ortaklar')
    .delete()
    .eq('sirket_id', sirketId)

  if (deleteResult.error) return deleteResult.error
  if (!partners.length) return null

  const { error } = await supabase
    .from('sirket_ortaklar')
    .insert(partners.map(partner => ({
      sirket_id: sirketId,
      ortak_adi: [partner.ad, partner.soyad].filter(Boolean).join(' ').trim(),
      ortak_tipi: partner.ortak_tipi || 'kisi',
      tckn_vkn: partner.tckn_vkn || null,
      hisse_orani: partner.hisse_orani ? Number(partner.hisse_orani) : null,
      imza_yetkisi: !!partner.imza_yetkisi,
    })))

  return error
}
