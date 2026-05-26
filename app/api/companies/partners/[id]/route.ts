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
import { requirePermission } from '@/lib/security/serverPermissions'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { operationStatusMessage } from '@/lib/operations/operationStatus'
import { duplicateOperationJsonResponse } from '@/lib/operations/apiResponse'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { stripOperationControlledFields as stripFieldControlFields } from '@/lib/field-controls/fieldControlGuards'

const PARTNER_DETAIL_SELECT = 'id,company_id,person_id,organization_id,owner_kind,partner_type,display_name,partner_name,identity_number,identity_tax_number,share_ratio,voting_ratio,profit_ratio,source_type,source_id,share_units,nominal_value,capital_amount,share_class,has_representation_right,signature_authority,has_control_right,control_type,has_board_nomination_right,has_veto_right,has_privileged_share,beneficial_owner,is_beneficial_owner,beneficial_ratio,is_ultimate_controller,start_date,end_date,status,record_status,history,photo_logo,partner_documents,partner_profile,notes,created_at,updated_at,version'
const PARTNER_SECTION_BASE_SELECT = 'id,company_id,person_id,organization_id,source_id,display_name,partner_name,version,updated_at'
const REPRESENTATIVE_CURRENT_AUTHORITY_SELECT = 'representative_id,company_id,tenant_id,authority_status,authority_record_status,authority_status_label,authority_types,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,limits,scope,requires_joint_signature,can_approve_alone,effective_date,end_date,warnings,last_transaction_id,last_transaction_type'

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

function stripPartnerOperationControlledFields(body: Record<string, any>) {
  return stripFieldControlFields('company_partner', body)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const section = request.nextUrl.searchParams.get('section')

  if (section === 'authorities' || section === 'relationsSummary') {
    const partnerResult = await safeReadRecord({
      supabase,
      request,
      tableName: 'company_partners',
      recordId: id,
      permissionKey: ['partners.view', 'companies.view'],
      select: PARTNER_SECTION_BASE_SELECT,
    })
    if (!partnerResult.ok) return safeCrudResponse(partnerResult)

    const partner = partnerResult.data
    const tenantContext = resolveTenantContext(request)
    let query = supabase
      .from('company_representatives')
      .select('id,company_id,person_id,organization_id,source_id,display_name,full_name,status,authority_types,job_title,signature_type,transaction_limit,currency,requires_joint_signature,can_approve_alone,start_date,end_date,is_deleted')
      .eq('company_id', partner.company_id)
      .limit(100)
    query = applyTenantQueryScope(query, 'company_representatives', tenantContext)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })

    const displayName = partner.display_name || partner.partner_name
    const representativeAuthorities = (data || []).filter((representative: Record<string, any>) =>
      !representative.is_deleted && (
        (partner.person_id && representative.person_id === partner.person_id) ||
        (partner.organization_id && representative.organization_id === partner.organization_id) ||
        (partner.source_id && representative.source_id === partner.source_id) ||
        (!!displayName && (representative.display_name === displayName || representative.full_name === displayName))
      )
    )
    const representativeIds = representativeAuthorities.map((representative: Record<string, any>) => representative.id).filter(Boolean)
    let representativeAuthoritiesWithCurrent: Record<string, any>[] = representativeAuthorities as Record<string, any>[]
    if (representativeIds.length) {
      let currentQuery = supabase
        .from('v_current_representative_authorities')
        .select(REPRESENTATIVE_CURRENT_AUTHORITY_SELECT)
        .in('representative_id', representativeIds)
      currentQuery = applyTenantQueryScope(currentQuery, 'v_current_representative_authorities', tenantContext)
      const { data: currentRows, error: currentError } = await currentQuery
      if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
      const currentByRepresentative = new Map((currentRows || []).map((row: Record<string, any>) => [row.representative_id, row]))
      representativeAuthoritiesWithCurrent = representativeAuthorities.map((representative: Record<string, any>) => {
        const current = currentByRepresentative.get(representative.id) as Record<string, any> | undefined
        if (!current) return representative
        return {
          ...representative,
          current_authority: current,
          authority_status: current.authority_status || null,
          authority_record_status: current.authority_record_status || null,
          authority_types: current.authority_types || representative.authority_types,
          signature_type: current.signature_type ?? representative.signature_type,
          transaction_limit: current.transaction_limit ?? representative.transaction_limit,
          currency: current.currency || representative.currency,
          start_date: current.effective_date || representative.start_date,
          end_date: current.end_date || representative.end_date,
          requires_joint_signature: current.requires_joint_signature ?? representative.requires_joint_signature,
          can_approve_alone: current.can_approve_alone ?? representative.can_approve_alone,
        }
      })
    }

    return NextResponse.json(
      { data: { representative_authorities: representativeAuthoritiesWithCurrent } },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }

  if (section === 'ownership') {
    const partnerResult = await safeReadRecord({
      supabase,
      request,
      tableName: 'company_partners',
      recordId: id,
      permissionKey: ['partners.view', 'companies.view'],
      select: PARTNER_SECTION_BASE_SELECT,
    })
    if (!partnerResult.ok) return safeCrudResponse(partnerResult)

    const partner = partnerResult.data
    const tenantContext = resolveTenantContext(request)
    let query = supabase
      .from('v_current_ownership')
      .select('company_id,partner_id,display_name,current_share_ratio,current_voting_ratio,current_profit_ratio,current_capital_amount,current_share_units,has_control_right,control_type,has_veto_right,has_board_nomination_right,has_privileged_share,is_beneficial_owner,beneficial_ratio,warnings')
      .eq('company_id', partner.company_id)
      .eq('partner_id', id)
    query = applyTenantQueryScope(query, 'v_current_ownership', tenantContext)
    const { data, error } = await query.maybeSingle()
    if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })

    return NextResponse.json(
      { data: { current_ownership: data || null } },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }

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
  const rawBody = await request.json()
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const body = stripPartnerOperationControlledFields(stripOperationControlFields(rawBody))

  const permission = await requirePermission(request, supabase, 'partners.edit')
  if (permission instanceof NextResponse) return permission
  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: tenantContext.tenantId,
    companyId: body.company_id || null,
    moduleKey: 'sirket',
    entityType: 'company_partner',
    entityId: id,
    operationType: 'partner.update',
    clientRequestId,
    baseVersion,
    baseUpdatedAt,
    requestedBy: permission.userId,
    payload: body,
  })
  if (operationCreate.ok && operationCreate.duplicate) return duplicateOperationJsonResponse(operationCreate.operation)
  if (!operationCreate.ok && !operationCreate.missingInfrastructure) {
    return NextResponse.json({ error: operationCreate.error, code: operationCreate.code || 'OPERATION_REQUEST_FAILED' }, { status: 500 })
  }
  const operation = operationCreate.ok ? operationCreate.operation : null
  if (operation) await operationService.markProcessing(operation.id)

  let result: Awaited<ReturnType<typeof safeUpdateRecord>>
  try {
    result = await safeUpdateRecord({
      supabase,
      request,
      tableName: 'company_partners',
      recordId: id,
      permissionKey: ['partners.edit', 'companies.edit'],
      patch: body,
      select: PARTNER_DETAIL_SELECT,
      currentSelect: PARTNER_DETAIL_SELECT,
      versionField: 'version',
      baseVersion,
      baseUpdatedAt,
      guard: async ({ current, patch }) => {
        const mapped = mapPartnerCardForDb(patch, current)
        return ensureUniqueRoleMaster(supabase as any, {
          tableName: 'company_partners',
          identity: mapped,
          excludeId: id,
          tenantContext,
        })
      },
      beforeUpdate: ({ current, patch }) => {
        const mapped = mapPartnerCardForDb(patch, current)
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
  } catch (error: any) {
    if (operation) await operationService.markFailed(operation.id, {
      code: error?.code || 'PARTNER_UPDATE_FAILED',
      error: error?.message || 'Ortak güncellemesi tamamlanamadı.',
    })
    return NextResponse.json({
      error: error?.message || 'Ortak güncellemesi tamamlanamadı.',
      code: error?.code || 'PARTNER_UPDATE_FAILED',
      ...(operation ? {
        operation_id: operation.id,
        operation_status: 'failed',
        message: operationStatusMessage('failed'),
      } : {}),
    }, { status: 500 })
  }

  if (!result.ok) {
    if (operation) await operationService.markFailed(operation.id, {
      code: result.code,
      error: result.error,
      details: result.details,
    })
    if (!operation) return safeCrudResponse(result)
    return NextResponse.json({
      error: result.error,
      code: result.code,
      details: result.details,
      operation_id: operation.id,
      operation_status: 'failed',
      message: operationStatusMessage('failed'),
    }, { status: result.status })
  }

  if (operation) {
    await operationService.markCompleted(operation.id, { id: result.data.id, data: result.data })
    await new OutboxEventService(supabase as any).enqueue({
      tenantId: tenantContext.tenantId,
      companyId: result.data.company_id || body.company_id || null,
      moduleKey: 'sirket',
      eventType: 'partner.updated',
      aggregateType: 'company_partner',
      aggregateId: id,
      operationId: operation.id,
      payload: { id, company_id: result.data.company_id || body.company_id || null, changed_fields: Object.keys(body) },
    }).catch(() => null)
  }

  return NextResponse.json({
    data: result.data,
    ...(operation ? {
      operation_id: operation.id,
      operation_status: 'completed',
      message: operationStatusMessage('completed'),
    } : {}),
  })
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
    select: 'id,company_id,record_status,status',
    lifecycleStatusField: ['record_status', 'status'],
    draftStatusValue: ['draft', 'taslak'],
    permissionKey: ['partners.delete', 'partners.edit', 'companies.edit'],
    referenceChecks: partnerDraftDeleteReferenceChecks(id),
  })

  if (draftDelete.ok) {
    await new OutboxEventService(supabase as any).enqueue({
      tenantId: tenantContext.tenantId,
      companyId: draftDelete.record.company_id || null,
      moduleKey: 'sirket',
      eventType: 'partner.deleted',
      aggregateType: 'company_partner',
      aggregateId: id,
      payload: { id, company_id: draftDelete.record.company_id || null, hard_deleted: true },
    }).catch(() => null)
    return safeHardDeleteDraftRecordResponse(draftDelete)
  }
  if (!['NOT_DRAFT_RECORD', 'REFERENCE_EXISTS', 'REFERENCE_NOT_SAFE_TO_CASCADE', 'P0001'].includes(draftDelete.code)) {
    return safeHardDeleteDraftRecordResponse(draftDelete)
  }

  return NextResponse.json({
    error: 'Aktif veya işlem geçmişi olan ortak doğrudan silinemez. Ortaklıktan çıkış / pay devri işlemi kullanılmalıdır.',
    code: 'PARTNER_DELETE_REQUIRES_OWNERSHIP_EXIT',
  }, { status: 409 })
}

function partnerDraftDeleteReferenceChecks(partnerId: string): SafeHardDeleteReferenceCheck[] {
  const partnerTransactionFilter = (query: any) =>
    query.or(`from_partner_id.eq.${partnerId},to_partner_id.eq.${partnerId},affected_partner_id.eq.${partnerId}`)

  return [
    {
      tableName: 'ownership_transactions',
      label: 'Ortaklık işlemleri',
      optional: true,
      query: query => partnerTransactionFilter(query),
    },
    { tableName: 'partner_ownership_lifecycle_events', foreignKey: 'partner_id', label: 'Ortak yaşam döngüsü kayıtları', mode: 'cascadeDelete', optional: true },
  ]
}

function mapPartnerCardForDb(partner: Record<string, any>, current?: Record<string, any>) {
  const ownerKind = normalizePartnerKind(partner.partner_type || partner.owner_kind || current?.owner_kind || current?.partner_type)
  const displayName = ownerKind === 'organization'
    ? partner.trade_name || partner.short_name || current?.display_name
    : [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim() || current?.display_name
  const profilePatch = stripMasterDataForRoleProfile(partner)
  const hasProfilePatch = Object.keys(profilePatch).length > 0

  return {
    company_id: partner.company_id || current?.company_id,
    partner_name: displayName || 'Ortak',
    partner_type: ownerKind,
    identity_tax_number: partner.identity_number || current?.identity_tax_number,
    owner_kind: ownerKind,
    source_type: partner.person_id ? 'master_person' : partner.organization_id ? 'master_organization' : partner.source_type || current?.source_type || 'partners_sayfasi',
    source_id: partner.person_id || partner.organization_id || partner.source_id || current?.source_id || null,
    person_id: partner.person_id || current?.person_id || null,
    organization_id: partner.organization_id || current?.organization_id || null,
    display_name: displayName || 'Ortak',
    identity_number: partner.identity_number || current?.identity_number,
    notes: partner.notes || null,
    photo_logo: partner.photo_logo || current?.photo_logo || [],
    partner_documents: partner.partner_documents || current?.partner_documents || [],
    partner_profile: hasProfilePatch
      ? { ...(current?.partner_profile || {}), ...profilePatch }
      : current?.partner_profile || {},
  }
}

function mapOwnershipTransactionForDb(body: Record<string, any>) {
  return {
    transaction_type: body.transaction_type,
    transaction_date: body.transaction_date,
    effective_date: body.effective_date,
    from_partner_id: body.from_partner_id || null,
    to_partner_id: body.to_partner_id || null,
    affected_partner_id: body.affected_partner_id || null,
    share_ratio: toNullableNumber(body.share_ratio),
    voting_ratio: toNullableNumber(body.voting_ratio),
    profit_ratio: toNullableNumber(body.profit_ratio),
    share_units: toNullableNumber(body.share_units),
    nominal_value: toNullableNumber(body.nominal_value),
    capital_amount: toNullableNumber(body.capital_amount),
    committed_capital_amount: toNullableNumber(body.committed_capital_amount),
    share_class: body.share_class || null,
    has_control_right: !!body.has_control_right,
    control_type: body.control_type || null,
    has_board_nomination_right: !!body.has_board_nomination_right,
    has_veto_right: !!body.has_veto_right,
    has_privileged_share: !!body.has_privileged_share,
    is_beneficial_owner: !!body.is_beneficial_owner,
    beneficial_ratio: toNullableNumber(body.beneficial_ratio),
    new_values: body.new_values || body,
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
