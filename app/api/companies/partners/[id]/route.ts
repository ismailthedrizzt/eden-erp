import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import {
  safeHardDeleteDraftRecord,
  safeHardDeleteDraftRecordResponse,
  type SafeHardDeleteReferenceCheck,
} from '@/lib/workflow/safeHardDeleteDraftRecord'
import { diffRecord, safeCrudResponse, safeReadRecord, safeUpdateRecord } from '@/lib/crud/safeCrudService'
import { ensureUniqueRoleMaster } from '@/lib/identity/roleUniqueness'
import { applyTenantQueryScope, resolveTenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'

const PARTNER_DETAIL_SELECT = 'id,company_id,person_id,organization_id,owner_kind,partner_type,display_name,partner_name,identity_number,identity_tax_number,share_ratio,voting_ratio,profit_ratio,source_type,source_id,share_units,nominal_value,capital_amount,share_class,has_representation_right,signature_authority,has_control_right,control_type,has_board_nomination_right,has_veto_right,has_privileged_share,beneficial_owner,is_beneficial_owner,beneficial_ratio,is_ultimate_controller,start_date,end_date,status,record_status,history,photo_logo,partner_documents,partner_profile,notes,created_at'

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

  const result = await safeReadRecord({
    supabase,
    request,
    tableName: 'company_partners',
    recordId: id,
    permissionKey: ['partners.view', 'companies.view'],
    select: PARTNER_DETAIL_SELECT,
    afterRead: async ({ record }) => hydratePartnerDetail(supabase, record),
  })

  if (!result.ok) return safeCrudResponse(result)
  return NextResponse.json(
    { data: result.data },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const tenantContext = resolveTenantContext(request)
  const body = await request.json()

  const result = await safeUpdateRecord({
    supabase,
    request,
    tableName: 'company_partners',
    recordId: id,
    permissionKey: ['partners.edit', 'companies.edit'],
    patch: body,
    select: PARTNER_DETAIL_SELECT,
    currentSelect: PARTNER_DETAIL_SELECT,
    guard: async ({ current, patch }) => {
      const mapped = mapPartnerForDb(patch, current)
      return ensureUniqueRoleMaster(supabase as any, {
        tableName: 'company_partners',
        identity: mapped,
        excludeId: id,
        tenantContext,
      })
    },
    beforeUpdate: ({ current, patch }) => {
      const mapped = mapPartnerForDb(patch, current)
      return {
        ...diffRecord(mapped, current),
        history: buildFieldHistory(current, mapped),
      }
    },
    afterUpdate: async ({ current, record }) => {
      const oldStatus = current.record_status || (current.status === 'Aktif' ? 'active' : current.status === 'Pasif' ? 'passive' : 'draft')
      const newStatus = record.record_status || (record.status === 'Aktif' ? 'active' : record.status === 'Pasif' ? 'passive' : 'draft')
      if (oldStatus !== newStatus || body.ownership_action) {
        await supabase.from('partner_ownership_lifecycle_events').insert(withTenantInsertScopeForTable({
          partner_id: record.id,
          company_id: record.company_id || record.company_id || null,
          event_type: body.ownership_action === 'initial_partnership_entry_completed'
            ? 'initial_partnership_entry_completed'
            : oldStatus === 'draft' && newStatus === 'active' ? 'ownership_defined' : 'status_changed',
          old_record_status: oldStatus,
          new_record_status: newStatus,
          payload_json: {
            source: 'partners_page',
            ownership_action: body.ownership_action || null,
          },
        }, 'partner_ownership_lifecycle_events', tenantContext))
      }
      if (record?.person_id) await syncMasterContact(supabase, 'person', record.person_id, body)
      if (record?.organization_id) await syncMasterContact(supabase, 'organization', record.organization_id, body)
      if (Array.isArray(body.entity_bank_accounts)) {
        const kind = record?.person_id ? 'person' : record?.organization_id ? 'organization' : null
        const masterId = record?.person_id || record?.organization_id
        if (kind && masterId) await new EntityBankAccountsService(supabase as any).syncMany(kind, masterId, body.entity_bank_accounts, null)
      }
      return hydratePartnerDetail(supabase, record)
    },
  })

  return safeCrudResponse(result)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const tenantContext = resolveTenantContext(request)

  const draftDelete = await safeHardDeleteDraftRecord({
    supabase,
    request,
    tableName: 'company_partners',
    recordId: id,
    select: 'id,record_status,status',
    lifecycleStatusField: ['record_status', 'status'],
    draftStatusValue: ['draft', 'taslak'],
    permissionKey: ['partners.delete', 'partners.edit', 'companies.edit'],
    referenceChecks: partnerDraftDeleteReferenceChecks(id),
  })

  if (draftDelete.ok) return safeHardDeleteDraftRecordResponse(draftDelete)
  if (draftDelete.code !== 'NOT_DRAFT_RECORD') return safeHardDeleteDraftRecordResponse(draftDelete)

  let passivateQuery = supabase
    .from('company_partners')
    .update({
      status: 'Pasif',
      record_status: 'passive',
    })
    .eq('id', id)

  passivateQuery = applyTenantQueryScope(passivateQuery, 'company_partners', tenantContext)
  const { error } = await passivateQuery

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'PASSIVATE_FAILED' }, { status: 500 })
  return NextResponse.json({ success: true })
}

function partnerDraftDeleteReferenceChecks(partnerId: string): SafeHardDeleteReferenceCheck[] {
  const partnerTransactionFilter = (query: any) =>
    query.or(`from_partner_id.eq.${partnerId},to_partner_id.eq.${partnerId},affected_partner_id.eq.${partnerId}`)

  return [
    {
      tableName: 'ownership_transactions',
      label: 'Onaylanmış/bekleyen ortaklık işlemleri',
      optional: true,
      query: query => partnerTransactionFilter(query).neq('approval_status', 'draft'),
    },
    {
      tableName: 'ownership_transactions',
      label: 'Taslak ortaklık işlemleri',
      mode: 'cascadeDelete',
      optional: true,
      query: query => partnerTransactionFilter(query).eq('approval_status', 'draft'),
    },
    { tableName: 'partner_ownership_lifecycle_events', foreignKey: 'partner_id', label: 'Ortak yaşam döngüsü kayıtları', mode: 'cascadeDelete', optional: true },
  ]
}

function mapPartnerForDb(partner: Record<string, any>, current?: Record<string, any>) {
  const ownerKind = normalizePartnerKind(partner.partner_type || partner.owner_kind || current?.owner_kind || current?.partner_type)
  const displayName = ownerKind === 'organization'
    ? partner.trade_name || partner.short_name || current?.display_name
    : [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim() || current?.display_name

  return {
    company_id: partner.company_id || current?.company_id,
    partner_name: displayName || 'Ortak',
    partner_type: ownerKind,
    identity_tax_number: partner.identity_number || current?.identity_tax_number,
    share_ratio: toNullableNumber(partner.share_ratio ?? current?.share_ratio),
    signature_authority: !!(partner.has_representation_right ?? current?.signature_authority),
    owner_kind: ownerKind,
    source_type: partner.person_id ? 'master_person' : partner.organization_id ? 'master_organization' : partner.source_type || current?.source_type || 'partners_sayfasi',
    source_id: partner.person_id || partner.organization_id || partner.source_id || current?.source_id || null,
    person_id: partner.person_id || current?.person_id || null,
    organization_id: partner.organization_id || current?.organization_id || null,
    display_name: displayName || 'Ortak',
    identity_number: partner.identity_number || current?.identity_number,
    share_class: partner.share_class || current?.share_class || 'Adi Pay',
    share_units: toNullableNumber(partner.share_units ?? current?.share_units),
    nominal_value: toNullableNumber(partner.nominal_value ?? current?.nominal_value),
    capital_amount: toNullableNumber(partner.capital_amount ?? current?.capital_amount),    voting_ratio: toNullableNumber(partner.voting_ratio ?? current?.voting_ratio),
    profit_ratio: toNullableNumber(partner.profit_ratio ?? current?.profit_ratio),
    beneficial_owner: !!current?.beneficial_owner,
    is_beneficial_owner: !!current?.is_beneficial_owner,
    beneficial_ratio: toNullableNumber(partner.beneficial_ratio ?? current?.beneficial_ratio),
    is_ultimate_controller: !!current?.is_ultimate_controller,
    has_representation_right: !!(partner.has_representation_right ?? current?.has_representation_right),
    has_control_right: !!current?.has_control_right,
    control_type: current?.control_type || null,
    has_board_nomination_right: !!current?.has_board_nomination_right,
    has_veto_right: !!current?.has_veto_right,
    has_privileged_share: !!(partner.has_privileged_share ?? current?.has_privileged_share),
    start_date: partner.start_date || current?.start_date,
    end_date: partner.end_date || null,
    status: partner.status || current?.status || 'Taslak',
    record_status: partner.record_status || current?.record_status || (partner.status === 'Aktif' ? 'active' : partner.status === 'Pasif' ? 'passive' : 'draft'),
    notes: partner.notes || null,
    photo_logo: partner.photo_logo || current?.photo_logo || [],
    partner_documents: partner.partner_documents || current?.partner_documents || [],
    partner_profile: stripMasterDataForRoleProfile(partner),
  }
}

function normalizePartnerKind(value: unknown): 'person' | 'organization' {
  const text = String(value || '').trim().toLocaleLowerCase('tr-TR')
  return ['organization', 'company', 'sirket', 'şirket', 'tüzel_kisi'].includes(text) ? 'organization' : 'person'
}

function toNullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

async function hydratePartnerDetail(supabase: ReturnType<typeof createServiceClient>, partner: Record<string, any>) {
  const assetHydrated = await hydratePartnerMasterAssets(supabase, partner)
  return assetHydrated?.person_id
    ? hydrateMasterContact(supabase, 'person', assetHydrated)
    : assetHydrated?.organization_id
      ? hydrateMasterContact(supabase, 'organization', assetHydrated)
      : assetHydrated
}

async function hydratePartnerMasterAssets(supabase: ReturnType<typeof createServiceClient>, partner: Record<string, any>) {
  if (!partner) return partner
  const hasPhoto = Array.isArray(partner.photo_logo) && partner.photo_logo.length > 0
  const hasDocuments = Array.isArray(partner.partner_documents) && partner.partner_documents.length > 0
  if (hasPhoto && hasDocuments) return partner

  if (partner.person_id) {
    const { data: employee } = await supabase
      .from('employees')
      .select('photo_url, cv_document, diploma_document, entry_documents, exit_documents')
      .eq('person_id', partner.person_id)
      .neq('record_status', 'passive')
      .maybeSingle()

    const photoLogo = hasPhoto
      ? partner.photo_logo
      : employee?.photo_url
        ? [{ slotId: 'photo_logo', name: 'Fotoğraf', previewUrl: employee.photo_url, url: employee.photo_url }]
        : []

    const documents = hasDocuments ? partner.partner_documents : normalizeEmployeeDocuments(employee || {})
    if (photoLogo.length) {
      await promotePersonPhotoToMaster(supabase, partner.person_id, photoLogo)
    }
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

async function promotePersonPhotoToMaster(
  supabase: ReturnType<typeof createServiceClient>,
  personId: string,
  photoLogo: Record<string, any>[]
) {
  const { data: person } = await supabase
    .from('persons')
    .select('metadata_json')
    .eq('id', personId)
    .maybeSingle()

  const metadata = person?.metadata_json && typeof person.metadata_json === 'object' ? person.metadata_json : {}
  const personMaster = metadata.person_master && typeof metadata.person_master === 'object' ? metadata.person_master : {}
  if (Array.isArray(personMaster.photo_logo) && personMaster.photo_logo.length) return

  await supabase
    .from('persons')
    .update({
      metadata_json: {
        ...metadata,
        person_master: {
          ...personMaster,
          photo_logo: photoLogo,
        },
      },
    })
    .eq('id', personId)
}

function normalizeEmployeeDocuments(employee: Record<string, any>) {
  const docs: Record<string, any>[] = []
  if (employee.cv_document && typeof employee.cv_document === 'object') docs.push({ slotId: 'cv', title: 'CV', ...employee.cv_document })
  if (employee.diploma_document && typeof employee.diploma_document === 'object') docs.push({ slotId: 'diploma', title: 'Diploma', ...employee.diploma_document })
  if (Array.isArray(employee.entry_documents)) docs.push(...employee.entry_documents)
  if (Array.isArray(employee.exit_documents)) docs.push(...employee.exit_documents)

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
