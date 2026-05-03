import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function buildFieldHistory(current: Record<string, any>, updates: Record<string, any>) {
  const existingHistory = Array.isArray(current.history) ? current.history : []
  const tracked = new Set(['share_ratio', 'voting_ratio', 'profit_ratio', 'control_type', 'status', 'start_date', 'end_date', 'source_id'])
  const nextHistory = [...existingHistory]

  Object.entries(updates).forEach(([field, nextValue]) => {
    if (!tracked.has(field)) return
    const previousValue = current[field]
    if (JSON.stringify(previousValue ?? null) === JSON.stringify(nextValue ?? null)) return
    nextHistory.push({
      field,
      old_value: previousValue ?? '',
      new_value: nextValue ?? '',
      changed_at: new Date().toISOString(),
      changed_by: 'Sistem Kullanıcısı',
    })
  })

  return nextHistory
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('sirket_ortaklar')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const { data: current, error: currentError } = await supabase
    .from('sirket_ortaklar')
    .select('*')
    .eq('id', id)
    .single()

  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })

  const mapped = mapPartnerForDb(body, current)
  const { data, error } = await supabase
    .from('sirket_ortaklar')
    .update({
      ...mapped,
      history: buildFieldHistory(current, mapped),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('sirket_ortaklar')
    .update({
      status: 'Pasif',
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: 'Sistem Kullanıcısı',
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'SOFT_DELETE_FAILED' }, { status: 500 })
  return NextResponse.json({ success: true })
}

function mapPartnerForDb(partner: Record<string, any>, current?: Record<string, any>) {
  const ownerKind = partner.partner_type || partner.owner_kind || current?.owner_kind || 'gercek_kisi'
  const displayName = ownerKind === 'tuzel_kisi'
    ? partner.trade_name || partner.short_name || current?.display_name
    : [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim() || current?.display_name

  return {
    sirket_id: partner.company_id || partner.sirket_id || current?.sirket_id,
    ortak_adi: displayName || 'Ortak',
    ortak_tipi: ownerKind === 'tuzel_kisi' ? 'sirket' : 'kisi',
    tckn_vkn: partner.identity_number || current?.tckn_vkn,
    hisse_orani: partner.share_ratio ?? current?.hisse_orani,
    imza_yetkisi: !!(partner.has_representation_right ?? current?.imza_yetkisi),
    owner_kind: ownerKind,
    source_type: partner.source_type || current?.source_type || 'ortaklar_sayfasi',
    source_id: partner.source_id || current?.source_id || null,
    display_name: displayName || 'Ortak',
    identity_number: partner.identity_number || current?.identity_number,
    share_class: partner.share_class || current?.share_class || 'Adi Pay',
    share_units: partner.share_units || null,
    nominal_value: partner.nominal_value || null,
    capital_amount: partner.capital_amount || null,
    share_ratio: partner.share_ratio ?? current?.share_ratio,
    voting_ratio: partner.voting_ratio || null,
    profit_ratio: partner.profit_ratio || null,
    beneficial_owner: !!(partner.beneficial_owner ?? partner.is_beneficial_owner ?? current?.beneficial_owner),
    is_beneficial_owner: !!(partner.beneficial_owner ?? partner.is_beneficial_owner ?? current?.is_beneficial_owner),
    beneficial_ratio: partner.beneficial_ratio || null,
    is_ultimate_controller: !!(partner.is_ultimate_controller ?? current?.is_ultimate_controller),
    has_representation_right: !!(partner.has_representation_right ?? current?.has_representation_right),
    has_control_right: !!(partner.has_control_right ?? current?.has_control_right),
    control_type: partner.control_type || null,
    has_board_nomination_right: !!(partner.has_board_nomination_right ?? current?.has_board_nomination_right),
    has_veto_right: !!(partner.has_veto_right ?? current?.has_veto_right),
    has_privileged_share: !!(partner.has_privileged_share ?? partner.has_privilege ?? current?.has_privileged_share),
    start_date: partner.start_date || current?.start_date,
    end_date: partner.end_date || null,
    status: partner.status || current?.status || 'Aktif',
    notes: partner.notes || null,
    photo_logo: partner.photo_logo || current?.photo_logo || [],
    partner_documents: partner.partner_documents || current?.partner_documents || [],
    partner_profile: partner,
  }
}
