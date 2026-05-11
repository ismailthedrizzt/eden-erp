import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hydrateMasterContact, syncMasterContact } from '@/lib/identity/masterContact'

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
  const assetHydrated = await hydratePartnerMasterAssets(supabase, data)
  const contactHydrated = assetHydrated?.person_id
    ? await hydrateMasterContact(supabase, 'person', assetHydrated)
    : assetHydrated?.organization_id
      ? await hydrateMasterContact(supabase, 'organization', assetHydrated)
      : assetHydrated
  return NextResponse.json({ data: contactHydrated })
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
  if (data?.person_id) await syncMasterContact(supabase, 'person', data.person_id, body)
  if (data?.organization_id) await syncMasterContact(supabase, 'organization', data.organization_id, body)
  await linkPartnerRegistryAssets(supabase, data)
  const hydrated = data?.person_id
    ? await hydrateMasterContact(supabase, 'person', data)
    : data?.organization_id
      ? await hydrateMasterContact(supabase, 'organization', data)
      : data
  return NextResponse.json({ data: hydrated })
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
    hisse_orani: current?.hisse_orani ?? null,
    imza_yetkisi: !!(partner.has_representation_right ?? current?.imza_yetkisi),
    owner_kind: ownerKind,
    source_type: partner.person_id ? 'master_person' : partner.organization_id ? 'master_organization' : partner.source_type || current?.source_type || 'ortaklar_sayfasi',
    source_id: partner.person_id || partner.organization_id || partner.source_id || current?.source_id || null,
    person_id: partner.person_id || current?.person_id || null,
    organization_id: partner.organization_id || current?.organization_id || null,
    display_name: displayName || 'Ortak',
    identity_number: partner.identity_number || current?.identity_number,
    share_class: partner.share_class || current?.share_class || 'Adi Pay',
    share_units: current?.share_units ?? null,
    nominal_value: current?.nominal_value ?? null,
    capital_amount: current?.capital_amount ?? null,
    share_ratio: current?.share_ratio ?? null,
    voting_ratio: current?.voting_ratio ?? null,
    profit_ratio: current?.profit_ratio ?? null,
    beneficial_owner: !!current?.beneficial_owner,
    is_beneficial_owner: !!current?.is_beneficial_owner,
    beneficial_ratio: current?.beneficial_ratio ?? null,
    is_ultimate_controller: !!current?.is_ultimate_controller,
    has_representation_right: !!(partner.has_representation_right ?? current?.has_representation_right),
    has_control_right: !!current?.has_control_right,
    control_type: current?.control_type || null,
    has_board_nomination_right: !!current?.has_board_nomination_right,
    has_veto_right: !!current?.has_veto_right,
    has_privileged_share: !!current?.has_privileged_share,
    start_date: partner.start_date || current?.start_date,
    end_date: partner.end_date || null,
    status: partner.status || current?.status || 'Aktif',
    notes: partner.notes || null,
    photo_logo: partner.photo_logo || current?.photo_logo || [],
    partner_documents: partner.partner_documents || current?.partner_documents || [],
    partner_profile: partner,
  }
}

async function hydratePartnerMasterAssets(supabase: ReturnType<typeof createServiceClient>, partner: Record<string, any>) {
  if (!partner) return partner
  const hasPhoto = Array.isArray(partner.photo_logo) && partner.photo_logo.length > 0
  const hasDocuments = Array.isArray(partner.partner_documents) && partner.partner_documents.length > 0
  if (hasPhoto && hasDocuments) return partner

  if (partner.person_id) {
    const { data: employee } = await supabase
      .from('employees')
      .select('fotograf_url, cv_belgesi, ise_giris_belgeleri, isten_cikis_belgeleri')
      .eq('person_id', partner.person_id)
      .eq('is_active', true)
      .maybeSingle()

    const photoLogo = hasPhoto
      ? partner.photo_logo
      : employee?.fotograf_url
        ? [{ slotId: 'photo_logo', name: 'Fotoğraf', previewUrl: employee.fotograf_url, url: employee.fotograf_url }]
        : []

    const documents = hasDocuments ? partner.partner_documents : normalizeEmployeeDocuments(employee || {})
    return {
      ...partner,
      photo_logo: photoLogo,
      partner_documents: documents,
      partner_profile: {
        ...(partner.partner_profile || {}),
        photo_logo: photoLogo,
        partner_documents: documents,
      },
    }
  }

  return partner
}

function normalizeEmployeeDocuments(employee: Record<string, any>) {
  const docs: Record<string, any>[] = []
  if (employee.cv_belgesi && typeof employee.cv_belgesi === 'object') docs.push({ slotId: 'cv', title: 'CV', ...employee.cv_belgesi })
  if (Array.isArray(employee.ise_giris_belgeleri)) docs.push(...employee.ise_giris_belgeleri)
  if (Array.isArray(employee.isten_cikis_belgeleri)) docs.push(...employee.isten_cikis_belgeleri)

  return docs.map((doc, index) => ({
    ...doc,
    slotId: doc.slotId || doc.slot_id || `employee_document_${index + 1}`,
    name: doc.name || doc.fileName || doc.file_name || doc.title || 'Belge',
    type: doc.type || doc.mime_type || doc.mimeType || 'application/octet-stream',
    size: doc.size || doc.file_size || 0,
    url: doc.url || doc.previewUrl || doc.preview_url,
    previewUrl: doc.previewUrl || doc.preview_url || doc.url,
    thumbnailUrl: doc.thumbnailUrl || doc.thumbnail_url || doc.preview_thumb_url || doc.preview_image_url,
  }))
}

async function linkPartnerRegistryAssets(supabase: ReturnType<typeof createServiceClient>, partner: Record<string, any>) {
  const docs = Array.isArray(partner.partner_documents) ? partner.partner_documents : []
  const images = Array.isArray(partner.photo_logo) ? partner.photo_logo : []

  await Promise.all([
    ...docs
      .filter((doc: Record<string, any>) => doc.documentId || doc.document_id)
      .map((doc: Record<string, any>) => supabase.from('document_links').insert({
        document_id: doc.documentId || doc.document_id,
        linked_module: 'partners',
        linked_record_id: partner.id,
        link_type: doc.linkType || doc.link_type || 'partner_document',
        notes: 'Master kimlikten ortak kaydına bağlandı',
      })),
    ...images
      .filter((image: Record<string, any>) => image.mediaAssetId || image.media_asset_id)
      .map((image: Record<string, any>) => supabase.from('media_assets').update({
        linked_module: 'partners',
        linked_record_id: partner.id,
      }).eq('id', image.mediaAssetId || image.media_asset_id)),
  ])
}
