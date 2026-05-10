import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hydrateMasterContact, syncMasterContact } from '@/lib/identity/masterContact'

const TRACKED_FIELDS = new Set([
  'status',
  'authority_types',
  'signature_type',
  'transaction_limit',
  'start_date',
  'end_date',
  'source_type',
  'source_id',
])

function buildHistory(current: Record<string, any>, updates: Record<string, any>) {
  const existingHistory = Array.isArray(current.history) ? current.history : []
  const nextHistory = [...existingHistory]

  Object.entries(updates).forEach(([field, nextValue]) => {
    if (!TRACKED_FIELDS.has(field)) return
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
    .from('sirket_temsilciler')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  const hydrated = data?.person_id
    ? await hydrateMasterContact(supabase, 'person', data)
    : data?.organization_id
      ? await hydrateMasterContact(supabase, 'organization', data)
      : data
  return NextResponse.json({ data: hydrated })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const body = await request.json()

  const { data: current, error: currentError } = await supabase
    .from('sirket_temsilciler')
    .select('*')
    .eq('id', id)
    .single()

  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })

  const mapped = mapRepresentativeForDb(body, current)
  const { data, error } = await supabase
    .from('sirket_temsilciler')
    .update({
      ...mapped,
      history: buildHistory(current, mapped),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UPDATE_FAILED' }, { status: 500 })
  if (data?.person_id) await syncMasterContact(supabase, 'person', data.person_id, body)
  if (data?.organization_id) await syncMasterContact(supabase, 'organization', data.organization_id, body)
  const hydrated = data?.person_id
    ? await hydrateMasterContact(supabase, 'person', data)
    : data?.organization_id
      ? await hydrateMasterContact(supabase, 'organization', data)
      : data
  return NextResponse.json({ data: hydrated })
}

const AUTHORITY_VALUE_BY_LABEL: Record<string, string> = {
  'İmza Yetkilisi': 'imza_yetkilisi',
  'Banka Yetkilisi': 'banka_yetkilisi',
  'GİB Yetkilisi': 'gib_yetkilisi',
  'SGK Yetkilisi': 'sgk_yetkilisi',
  'Sözleşme Yetkilisi': 'sozlesme_yetkilisi',
  'Satınalma Onay Yetkilisi': 'satinalma_onay_yetkilisi',
  'Ödeme Onay Yetkilisi': 'odeme_onay_yetkilisi',
  'Mesul Müdür': 'mesul_mudur',
  'Kanuni Temsilci': 'kanuni_temsilci',
}

function normalizeAuthorityType(value: unknown) {
  const text = String(value || '').trim()
  return AUTHORITY_VALUE_BY_LABEL[text] || text
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('sirket_temsilciler')
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

function mapRepresentativeForDb(representative: Record<string, any>, current?: Record<string, any>) {
  const authorityTypes = representative.authority_types?.length
    ? representative.authority_types.map(normalizeAuthorityType)
    : [normalizeAuthorityType(representative.primary_authority_type || current?.authority_types?.[0])].filter(Boolean)

  return {
    sirket_id: representative.company_id || representative.sirket_id || current?.sirket_id,
    ad_soyad: representative.display_name || current?.display_name || 'Temsilci',
    gorev: normalizeAuthorityType(representative.primary_authority_type || current?.gorev) || null,
    yetki_turu: 'diger',
    authority_types: authorityTypes,
    person_kind: representative.person_or_entity_type || current?.person_kind || 'gercek_kisi',
    source_type: representative.source_type || current?.source_type,
    source_id: representative.source_id || current?.source_id,
    display_name: representative.display_name || current?.display_name,
    start_date: representative.start_date || current?.start_date,
    end_date: representative.end_date || null,
    status: representative.status || current?.status || 'Aktif',
    notes: representative.notes || null,
    signature_type: representative.signature_type || null,
    transaction_limit: representative.authority_limit || representative.transaction_limit || null,
    currency: representative.currency || current?.currency || 'TRY',
    requires_joint_signature: !!(representative.requires_joint_signature ?? current?.requires_joint_signature),
    can_approve_alone: !!(representative.can_approve_alone ?? current?.can_approve_alone),
    photo_logo: representative.photo_logo || current?.photo_logo || [],
    authority_documents: representative.authority_documents || current?.authority_documents || [],
    representative_profile: representative,
  }
}
