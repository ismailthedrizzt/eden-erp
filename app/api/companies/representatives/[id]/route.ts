// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: representatives
// TARGET_ENDPOINT: /api/v1/representatives/{representative_id}
// NOTES: Authority transaction and scope behavior should move to Python Representative Authority Domain.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { requireAnyPermission } from '@/lib/security/serverPermissions'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import { diffRecord, safeCrudResponse, safeReadRecord, safeUpdateRecord } from '@/lib/crud/safeCrudService'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { duplicateOperationJsonResponse } from '@/lib/operations/apiResponse'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { operationStatusMessage } from '@/lib/operations/operationStatus'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { isMissingTableError } from '@/lib/modules/companies/companyErrors'
import { validateRepresentativeAuthorityScopePolicy } from '@/lib/security/policies/representativeAuthorityPolicies'
import { stripOperationControlledFields as stripFieldControlFields } from '@/lib/field-controls/fieldControlGuards'

const REPRESENTATIVE_DETAIL_SELECT = 'id,company_id,person_id,organization_id,person_kind,source_type,source_id,display_name,full_name,phone,email,authority_types,job_title,authority_type,status,record_status,start_date,end_date,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,requires_joint_signature,can_approve_alone,bank_authority_level,department_scope,gib_permissions,can_submit_declaration,can_process_e_invoice,sgk_permissions,can_submit_hiring_notice,can_submit_termination_notice,official_correspondence_authority,is_deleted,history,photo_logo,authority_documents,representative_profile,notes,created_at,updated_at,version'
const CURRENT_AUTHORITY_SELECT = 'representative_id,company_id,tenant_id,authority_status,authority_record_status,authority_status_label,authority_types,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,limits,scope,requires_joint_signature,can_approve_alone,effective_date,end_date,warnings,last_transaction_id,last_transaction_type,display_name,person_id,organization_id'
const AUTHORITY_TRANSACTION_SELECT = 'id,company_id,representative_id,person_id,organization_id,transaction_no,transaction_type,transaction_status,authority_effect_status,authority_record_status,authority_types,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,limits,scope,requires_joint_signature,can_approve_alone,document_files,effective_date,end_date,approval_status,workflow_status,notes,warnings,reversal_transaction_id,new_values,created_at,updated_at,version'

const AUTHORITY_TRANSACTION_TYPES = new Set([
  'Temsilcilik Başlatma',
  'Yetki Yenileme',
  'Yetki Kapsamı Değişikliği',
  'Limit Değişikliği',
  'Askıya Alma',
  'Sonlandırma',
  'Düzeltme Kaydı',
  'Ters Kayıt',
])
const REPRESENTATIVE_SCOPE_FIELDS = new Set(['scope_type', 'branch_id', 'organization_unit_id', 'facility_id', 'scope_label', 'scope_notes'])

function buildHistory(current: Record<string, any>, updates: Record<string, any>) {
  const existingHistory = Array.isArray(current.history) ? current.history : []
  const nextHistory = [...existingHistory]

  Object.entries(updates).forEach(([field, nextValue]) => {
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

function stripRepresentativeOperationControlledFields(body: Record<string, any>) {
  return stripFieldControlFields('company_representative', body)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const tenantContext = resolveTenantContext(request)

  const result = await safeReadRecord({
    supabase,
    request,
    tableName: 'company_representatives',
    recordId: id,
    permissionKey: ['representatives.view', 'companies.view'],
    select: REPRESENTATIVE_DETAIL_SELECT,
    afterRead: async ({ record }) => hydrateRepresentativeDetail(supabase, record, tenantContext),
  })

  if (!result.ok) return safeCrudResponse(result)
  if (result.data?.company_id) {
    const scope = await getTenantCompanyScope(supabase, tenantContext.tenantId, result.data.company_id)
    if (!scope) return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
  }
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
  const isAuthorityTransaction = !!rawBody.authority_action || AUTHORITY_TRANSACTION_TYPES.has(String(rawBody.transaction_type || ''))
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const rawPatch = stripOperationControlFields(rawBody)
  if (!isAuthorityTransaction) {
    const blockedScopeFields = Object.keys(rawPatch).filter(field => REPRESENTATIVE_SCOPE_FIELDS.has(field))
    if (blockedScopeFields.length) {
      return NextResponse.json({
        error: 'Yetki kapsami temsilci kartindan dogrudan degistirilemez. Yetki Kapsami Degisikligi islemiyle guncellenir.',
        code: 'OPERATION_CONTROLLED_FIELDS',
        details: {
          fields: blockedScopeFields.map(field => ({
            field,
            label: representativeScopeFieldLabel(field),
            operation: 'Yetki Kapsami Degisikligi',
            wizardKey: 'representative_authority_scope_change',
          })),
        },
      }, { status: 409 })
    }
  }
  const body = isAuthorityTransaction
    ? rawPatch
    : stripRepresentativeOperationControlledFields(rawPatch)

  const permission = await requireAnyPermission(request, supabase, ['representatives.edit', 'companies.edit'])
  if (permission instanceof NextResponse) return permission

  const operationService = new OperationRequestService(supabase as any)
  let operation = null
  if (!isAuthorityTransaction) {
    const operationCreate = await operationService.createOrGet({
      tenantId: tenantContext.tenantId,
      companyId: body.company_id || null,
      moduleKey: 'sirket',
      entityType: 'company_representative',
      entityId: id,
      operationType: 'representative.update',
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
    operation = operationCreate.ok ? operationCreate.operation : null
    if (operation) await operationService.markProcessing(operation.id)
  }

  try {
    const result = isAuthorityTransaction
      ? await applyAuthorityTransaction({
        supabase,
        request,
        representativeId: id,
        body,
        baseVersion,
        baseUpdatedAt,
        clientRequestId,
        requestedBy: permission.userId,
        tenantContext,
      })
      : await updateRepresentativeNormally({
        supabase,
        request,
        representativeId: id,
        body,
        baseVersion,
        baseUpdatedAt,
        tenantContext,
      })

    if (!result.ok) {
      if (operation) await operationService.markFailed(operation.id, {
        code: result.code,
        error: result.error,
        details: (result as any).details,
      })
      if (!operation) return safeCrudResponse(result)
      return NextResponse.json({
        error: result.error,
        code: result.code,
        details: (result as any).details,
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
        eventType: isAuthorityTransaction ? 'representative.authority.updated' : 'representative.updated',
        aggregateType: 'company_representative',
        aggregateId: id,
        operationId: operation.id,
        payload: {
          id,
          company_id: result.data.company_id || body.company_id || null,
          transaction_type: isAuthorityTransaction ? body.transaction_type : null,
          changed_fields: Object.keys(body),
        },
      }).catch(() => null)
    }

    const operationMetadata = (result as any).operation_id
      ? {
        operation_id: (result as any).operation_id,
        operation_status: (result as any).operation_status || 'completed',
        message: operationStatusMessage(((result as any).operation_status || 'completed') as any),
      }
      : operation ? {
        operation_id: operation.id,
        operation_status: 'completed',
        message: operationStatusMessage('completed'),
      } : {}

    return NextResponse.json({
      data: result.data,
      ...operationMetadata,
    })
  } catch (error: any) {
    if (operation) await operationService.markFailed(operation.id, {
      code: error?.code || 'REPRESENTATIVE_UPDATE_FAILED',
      error: error?.message || 'Temsilci güncellemesi tamamlanamadı.',
    })
    return NextResponse.json({
      error: error?.message || 'Temsilci güncellemesi tamamlanamadı.',
      code: error?.code || 'REPRESENTATIVE_UPDATE_FAILED',
      ...(operation ? {
        operation_id: operation.id,
        operation_status: 'failed',
        message: operationStatusMessage('failed'),
      } : {}),
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requireAnyPermission(request, supabase, ['representatives.delete', 'representatives.edit'])
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const rawBody = await request.json().catch(() => ({}))
  const clientRequestId = resolveClientRequestId(request, rawBody)

  let currentQuery = supabase
    .from('company_representatives')
    .select(REPRESENTATIVE_DETAIL_SELECT)
    .eq('id', id)
  currentQuery = applyTenantQueryScope(currentQuery, 'company_representatives', tenantContext)
  const { data: current, error: currentError } = await currentQuery.maybeSingle()
  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'Temsilci bulunamadı', code: 'REPRESENTATIVE_NOT_FOUND' }, { status: 404 })

  const effectiveStatus = normalizeMainRecordStatus(current.record_status || current.status)
  const hasAuthorityTransactions = await representativeHasAuthorityTransactions(supabase, id, tenantContext)
  if (effectiveStatus !== 'draft' || hasAuthorityTransactions) {
    return NextResponse.json({
      error: 'Aktif veya işlem geçmişi olan temsilci doğrudan silinemez. Yetkiyi Sonlandırma wizardı ile kapatın.',
      code: 'REPRESENTATIVE_DELETE_REQUIRES_TERMINATION',
    }, { status: 409 })
  }

  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: tenantContext.tenantId,
    companyId: current.company_id || null,
    moduleKey: 'sirket',
    entityType: 'company_representative',
    entityId: id,
    operationType: 'representative.delete',
    clientRequestId,
    requestedBy: permission.userId,
    payload: { id },
  })
  if (operationCreate.ok && operationCreate.duplicate) return duplicateOperationJsonResponse(operationCreate.operation)
  if (!operationCreate.ok && !operationCreate.missingInfrastructure) {
    return NextResponse.json({ error: operationCreate.error, code: operationCreate.code || 'OPERATION_REQUEST_FAILED' }, { status: 500 })
  }
  const operation = operationCreate.ok ? operationCreate.operation : null
  if (operation) await operationService.markProcessing(operation.id)

  let deleteQuery = supabase
    .from('company_representatives')
    .delete()
    .eq('id', id)
  deleteQuery = applyTenantQueryScope(deleteQuery, 'company_representatives', tenantContext)
  const { error } = await deleteQuery

  if (error) {
    if (operation) await operationService.markFailed(operation.id, { code: error.code || 'DELETE_FAILED', error: error.message })
    return NextResponse.json({ error: error.message, code: error.code || 'DELETE_FAILED' }, { status: 500 })
  }

  if (operation) {
    await operationService.markCompleted(operation.id, { id, deleted: true })
    await new OutboxEventService(supabase as any).enqueue({
      tenantId: tenantContext.tenantId,
      companyId: current.company_id || null,
      moduleKey: 'sirket',
      eventType: 'representative.deleted',
      aggregateType: 'company_representative',
      aggregateId: id,
      operationId: operation.id,
      payload: { id, company_id: current.company_id || null, hard_deleted: true },
    }).catch(() => null)
  }
  return NextResponse.json({
    success: true,
    hardDeleted: true,
    ...(operation ? {
      operation_id: operation.id,
      operation_status: 'completed',
      message: operationStatusMessage('completed'),
    } : {}),
  })
}

async function updateRepresentativeNormally({
  supabase,
  request,
  representativeId,
  body,
  baseVersion,
  baseUpdatedAt,
  tenantContext,
}: {
  supabase: ReturnType<typeof createServiceClient>
  request: NextRequest
  representativeId: string
  body: Record<string, any>
  baseVersion: number | null
  baseUpdatedAt: string | null
  tenantContext: ReturnType<typeof resolveTenantContext>
}) {
  return safeUpdateRecord({
    supabase,
    request,
    tableName: 'company_representatives',
    recordId: representativeId,
    permissionKey: ['representatives.edit', 'companies.edit'],
    patch: body,
    select: REPRESENTATIVE_DETAIL_SELECT,
    currentSelect: REPRESENTATIVE_DETAIL_SELECT,
    versionField: 'version',
    baseVersion,
    baseUpdatedAt,
    guard: async ({ current }) => {
      const nextCompanyId = body.company_id || current.company_id
      if (body.company_id && body.company_id !== current.company_id) {
        const recordStatus = String(current.record_status || '').toLocaleLowerCase('tr-TR')
        if (recordStatus && recordStatus !== 'draft') {
          return { ok: false, status: 409, code: 'REPRESENTATIVE_COMPANY_IMMUTABLE', error: 'Aktif temsilcilik ilişkisi normal edit ile başka şirkete taşınamaz.' }
        }
      }
      if (!nextCompanyId) return { ok: true }
      const scope = await getTenantCompanyScope(supabase, tenantContext.tenantId, nextCompanyId)
      if (!scope) return { ok: false, status: 404, code: 'COMPANY_NOT_FOUND', error: 'Şirket bulunamadı' }
      if (!isWritableCompanyScope(scope)) return { ok: false, status: 403, code: 'COMPANY_SCOPE_READONLY', error: 'Bu şirket için yalnızca görüntüleme yetkiniz var.' }
      if (body.company_id && body.company_id !== current.company_id) {
        const duplicate = await findExistingRepresentativeForCompany(supabase, {
          companyId: nextCompanyId,
          personId: current.person_id || null,
          organizationId: current.organization_id || null,
          excludeId: representativeId,
          tenantContext,
        })
        if (duplicate) {
          return { ok: false, status: 409, code: 'DUPLICATE_REPRESENTATIVE', error: 'Bu şirket için aynı kişi/kurum adına temsilci kartı zaten var.' }
        }
      }
      return { ok: true }
    },
    beforeUpdate: ({ current, patch }) => {
      const mapped = mapRepresentativeCardForDb(patch, current)
      const changed = diffRecord(mapped, current)
      if (!Object.keys(changed).length) return {}
      return {
        ...changed,
        history: buildHistory(current, changed),
      }
    },
    afterUpdate: async ({ record }) => {
      if (record?.person_id) await syncMasterContact(supabase, 'person', record.person_id, body)
      if (record?.organization_id) await syncMasterContact(supabase, 'organization', record.organization_id, body)
      if (Array.isArray(body.entity_bank_accounts)) {
        const kind = record?.person_id ? 'person' : record?.organization_id ? 'organization' : null
        const masterId = record?.person_id || record?.organization_id
        if (kind && masterId) await new EntityBankAccountsService(supabase as any).syncMany(kind, masterId, body.entity_bank_accounts, null)
      }
      return hydrateRepresentativeDetail(supabase, record, tenantContext)
    },
  })
}

async function applyAuthorityTransaction({
  supabase,
  request,
  representativeId,
  body,
  baseVersion,
  baseUpdatedAt,
  clientRequestId,
  requestedBy,
  tenantContext,
}: {
  supabase: ReturnType<typeof createServiceClient>
  request: NextRequest
  representativeId: string
  body: Record<string, any>
  baseVersion: number | null
  baseUpdatedAt: string | null
  clientRequestId: string
  requestedBy?: string | null
  tenantContext: ReturnType<typeof resolveTenantContext>
}) {
  const currentResult = await safeReadRecord({
    supabase,
    request,
    tableName: 'company_representatives',
    recordId: representativeId,
    permissionKey: ['representatives.edit', 'companies.edit'],
    select: REPRESENTATIVE_DETAIL_SELECT,
  })
  if (!currentResult.ok) return currentResult
  const current = currentResult.data
  const conflict = detectRepresentativeConflict(current, baseVersion, baseUpdatedAt)
  if (conflict) return conflict

  const scope = current.company_id ? await getTenantCompanyScope(supabase, tenantContext.tenantId, current.company_id) : null
  if (!scope) return { ok: false as const, status: 404, code: 'COMPANY_NOT_FOUND', error: 'Şirket bulunamadı' }
  if (!isWritableCompanyScope(scope)) return { ok: false as const, status: 403, code: 'COMPANY_SCOPE_READONLY', error: 'Bu şirket için yalnızca görüntüleme yetkiniz var.' }

  const transactionType = String(body.transaction_type || '')
  if (!AUTHORITY_TRANSACTION_TYPES.has(transactionType)) {
    return { ok: false as const, status: 400, code: 'INVALID_TRANSACTION_TYPE', error: 'Geçersiz temsilcilik işlem tipi.' }
  }
  const currentAuthority = await fetchCurrentAuthority(supabase, representativeId, tenantContext)
  const recordStatus = normalizeMainRecordStatus(current.record_status || current.status)
  const authorityRecordStatus = normalizeAuthorityRecordStatus(currentAuthority?.authority_record_status || currentAuthority?.authority_status)
  const lifecycleViolation = validateRepresentativeLifecycleTransition(transactionType, recordStatus, authorityRecordStatus)
  if (lifecycleViolation) return lifecycleViolation

  const authorityTypes = Array.isArray(body.authority_types)
    ? body.authority_types.filter(Boolean)
    : [body.primary_authority_type].filter(Boolean)
  const documentFiles = Array.isArray(body.document_files)
    ? body.document_files
    : Array.isArray(current.authority_documents)
      ? current.authority_documents
      : []
  const precheck = validateRepresentativeAuthorityTransactionPayload(transactionType, {
    authorityTypes,
    signatureType: body.signature_type,
    effectiveDate: body.effective_date || body.start_date,
    documentFiles,
    terminationReason: body.termination_reason || body.notes,
  })
  if (precheck) return precheck
  if (!isRepresentativeTerminationTransaction(transactionType)) {
    const scopeValidation = await validateRepresentativeAuthorityScopePolicy({
      supabase,
      tenantContext,
      companyId: current.company_id,
      scope: buildRepresentativeAuthorityScope(body, currentAuthority),
    })
    if (scopeValidation) return scopeValidation
  }
  const transactionPayload = mapRepresentativeAuthorityTransactionForDb(body, current, currentAuthority, transactionType)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('perform_representative_authority_transaction', {
    p_representative_id: representativeId,
    p_transaction_type: transactionType,
    p_payload: transactionPayload,
    p_client_request_id: clientRequestId,
    p_requested_by: requestedBy || null,
    p_base_version: baseVersion,
    p_base_updated_at: baseUpdatedAt,
  })

  if (rpcError) {
    return { ok: false as const, status: 500, code: rpcError.code || 'AUTHORITY_TRANSACTION_FAILED', error: rpcError.message }
  }

  const operationResult = (rpcResult || {}) as Record<string, any>
  if (operationResult.ok === false) {
    return {
      ok: false as const,
      status: Number(operationResult.http_status || 409),
      code: operationResult.code || 'AUTHORITY_TRANSACTION_REJECTED',
      error: operationResult.error || 'Temsilcilik işlemi tamamlanamadı.',
      details: operationResult.details,
      operation_id: operationResult.operation_id,
      operation_status: operationResult.operation_status,
    }
  }

  await new OutboxEventService(supabase as any).enqueue({
    tenantId: tenantContext.tenantId,
    companyId: current.company_id || null,
    moduleKey: 'representatives',
    eventType: representativeAuthorityEventType(transactionType),
    aggregateType: 'representative_authority_transaction',
    aggregateId: operationResult.transaction_id || representativeId,
    operationId: operationResult.operation_id || null,
    payload: {
      representative_id: representativeId,
      company_id: current.company_id || null,
      scope_type: transactionPayload.scope.scope_type,
      branch_id: transactionPayload.scope.branch_id,
      organization_unit_id: transactionPayload.scope.organization_unit_id,
      facility_id: transactionPayload.scope.facility_id,
      authority_types: transactionPayload.authority_types,
      transaction_id: operationResult.transaction_id || null,
      transaction_type: transactionType,
    },
  }).catch(() => null)

  const refreshed = await safeReadRecord({
    supabase,
    request,
    tableName: 'company_representatives',
    recordId: representativeId,
    permissionKey: ['representatives.view', 'companies.view'],
    select: REPRESENTATIVE_DETAIL_SELECT,
    afterRead: async ({ record }) => hydrateRepresentativeDetail(supabase, {
      ...record,
      last_authority_transaction: operationResult.transaction || null,
    }, tenantContext),
  })
  return refreshed.ok
    ? {
      ...refreshed,
      operation_id: operationResult.operation_id,
      operation_status: operationResult.operation_status || 'completed',
    }
    : refreshed
}

function representativeScopeFieldLabel(field: string) {
  if (field === 'scope_type') return 'Yetki kapsami'
  if (field === 'branch_id') return 'Sube kapsami'
  if (field === 'organization_unit_id') return 'Organizasyon birimi kapsami'
  if (field === 'facility_id') return 'Tesis/lokasyon kapsami'
  if (field === 'scope_label') return 'Kapsam etiketi'
  if (field === 'scope_notes') return 'Kapsam aciklamasi'
  return field
}

function representativeAuthorityEventType(transactionType: string) {
  const normalized = transactionType.toLocaleLowerCase('tr-TR')
  if (normalized.includes('latma')) return 'representative.authority_started'
  if (normalized.includes('ask')) return 'representative.authority_suspended'
  if (normalized.includes('son') || normalized.includes('ters')) return 'representative.authority_terminated'
  return 'representative.authority_updated'
}

function normalizeMainRecordStatus(value: unknown) {
  const text = String(value || '').toLocaleLowerCase('tr-TR')
  if (text.includes('pasif') || text === 'passive') return 'passive'
  if (text.includes('aktif') || ['active', 'suspended', 'expired', 'terminated'].includes(text) || text.includes('ask') || text.includes('son')) return 'active'
  return 'draft'
}

function normalizeAuthorityRecordStatus(value: unknown) {
  const text = String(value || '').toLocaleLowerCase('tr-TR')
  if (text.includes('ask')) return 'suspended'
  if (text.includes('sona') || text.includes('son')) return 'terminated'
  if (text.includes('süre') || text.includes('sure') || text === 'expired') return 'expired'
  if (text.includes('aktif') || text === 'active') return 'active'
  return text || 'draft'
}

function getAuthorityEffectStatusForTransaction(transactionType: string, body: Record<string, any>) {
  const explicit = normalizeAuthorityRecordStatus(body.authority_effect_status || body.authority_record_status)
  if (explicit !== 'draft') return explicit
  const normalizedType = transactionType.toLocaleLowerCase('tr-TR')
  if (normalizedType.includes('ask')) return 'suspended'
  if (normalizedType.includes('son')) return 'terminated'
  if (normalizedType.includes('ters')) return 'terminated'
  return 'active'
}

function validateRepresentativeLifecycleTransition(transactionType: string, recordStatus: string, authorityRecordStatus: string) {
  if (transactionType === 'Temsilcilik Başlatma' && recordStatus !== 'draft') {
    return { ok: false as const, status: 409, code: 'REPRESENTATIVE_ACTIVATION_REQUIRES_DRAFT', error: 'Temsilcilik Başlatma yalnızca Taslak temsilci kartları için çalışır.' }
  }
  if (['Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Limit Değişikliği', 'Düzeltme Kaydı', 'Ters Kayıt'].includes(transactionType) && recordStatus !== 'active') {
    return { ok: false as const, status: 409, code: 'REPRESENTATIVE_AUTHORITY_CHANGE_REQUIRES_ACTIVE', error: 'Yetki, limit, kurum veya imza değişiklikleri yalnızca Aktif temsilciler için operation olarak yapılabilir.' }
  }
  if (transactionType === 'Yetki Yenileme' && authorityRecordStatus === 'suspended') return null
  if (['Yetki Kapsamı Değişikliği', 'Limit Değişikliği', 'Düzeltme Kaydı', 'Ters Kayıt'].includes(transactionType) && authorityRecordStatus !== 'active') {
    return { ok: false as const, status: 409, code: 'REPRESENTATIVE_AUTHORITY_CHANGE_REQUIRES_ACTIVE_AUTHORITY', error: 'Bu işlem için güncel yetki Aktif olmalıdır.' }
  }
  if (transactionType === 'Askıya Alma' && (recordStatus !== 'active' || authorityRecordStatus !== 'active')) {
    return { ok: false as const, status: 409, code: 'REPRESENTATIVE_SUSPEND_REQUIRES_ACTIVE', error: 'Askıya alma yalnızca Aktif temsilciler için yapılabilir.' }
  }
  if (transactionType === 'Sonlandırma' && (recordStatus !== 'active' || !['active', 'suspended'].includes(authorityRecordStatus))) {
    return { ok: false as const, status: 409, code: 'REPRESENTATIVE_TERMINATE_REQUIRES_ACTIVE', error: 'Temsilcilik Sonlandırma yalnızca Aktif veya Askıda temsilciler için yapılabilir.' }
  }
  return null
}

function isRepresentativeTerminationTransaction(transactionType: string) {
  return ['Askıya Alma', 'Sonlandırma', 'Ters Kayıt'].includes(transactionType)
}

function validateRepresentativeAuthorityTransactionPayload(
  transactionType: string,
  input: {
    authorityTypes: string[]
    signatureType?: string | null
    effectiveDate?: string | null
    documentFiles: unknown[]
    terminationReason?: string | null
  }
) {
  if (!input.effectiveDate) {
    return { ok: false as const, status: 400, code: 'EFFECTIVE_DATE_REQUIRED', error: 'Yürürlük tarihi zorunludur.' }
  }
  if (transactionType !== 'Sonlandırma') {
    if (!input.authorityTypes.length) {
      return { ok: false as const, status: 400, code: 'AUTHORITY_TYPE_REQUIRED', error: 'En az bir yetki tipi seçilmelidir.' }
    }
    if (input.authorityTypes.includes('signature_authority') && !input.signatureType) {
      return { ok: false as const, status: 400, code: 'SIGNATURE_TYPE_REQUIRED', error: 'İmza yetkisi için imza türü zorunludur.' }
    }
  }
  if (transactionType === 'Temsilcilik Başlatma' && !input.documentFiles.length) {
    return { ok: false as const, status: 400, code: 'AUTHORITY_DOCUMENT_REQUIRED', error: 'Aktivasyon için en az bir yetki belgesi gereklidir.' }
  }
  if (transactionType === 'Sonlandırma') {
    if (!input.terminationReason) {
      return { ok: false as const, status: 400, code: 'TERMINATION_REASON_REQUIRED', error: 'Sonlandırma nedeni zorunludur.' }
    }
    if (!input.documentFiles.length) {
      return { ok: false as const, status: 400, code: 'TERMINATION_DOCUMENT_REQUIRED', error: 'Sonlandırma işlemi için belge gereklidir.' }
    }
  }
  return null
}

function detectRepresentativeConflict(current: Record<string, any>, baseVersion: number | null, baseUpdatedAt: string | null) {
  if (baseVersion !== null && Number(current.version || 0) !== Number(baseVersion)) {
    return {
      ok: false as const,
      status: 409,
      code: 'VERSION_CONFLICT',
      error: 'Kayıt başka bir işlem tarafından güncellendi. Lütfen sayfayı yenileyip tekrar deneyin.',
    }
  }
  if (baseUpdatedAt && current.updated_at && new Date(current.updated_at).getTime() !== new Date(baseUpdatedAt).getTime()) {
    return {
      ok: false as const,
      status: 409,
      code: 'VERSION_CONFLICT',
      error: 'Kayıt başka bir işlem tarafından güncellendi. Lütfen sayfayı yenileyip tekrar deneyin.',
    }
  }
  return null
}

function normalizeAuthorityType(value: unknown) {
  return String(value || '').trim()
}

function normalizeAuthorityTypes(value: unknown) {
  const source = Array.isArray(value) ? value : [value]
  return Array.from(new Set(source.map(normalizeAuthorityType).filter(Boolean)))
}

function mapRepresentativeCardForDb(representative: Record<string, any>, current?: Record<string, any>) {
  const profilePatch = stripMasterDataForRoleProfile(representative)
  const hasProfilePatch = Object.keys(profilePatch).length > 0
  const displayName = representative.display_name || buildDisplayName(representative, current) || current?.display_name || current?.full_name || 'Temsilci'

  return {
    company_id: representative.company_id || current?.company_id,
    full_name: displayName,
    person_kind: representative.person_or_entity_type || current?.person_kind || 'person',
    source_type: representative.source_type || current?.source_type,
    source_id: representative.source_id || current?.source_id,
    display_name: displayName,
    notes: representative.notes ?? current?.notes ?? null,
    phone: representative.phone ?? current?.phone ?? null,
    email: representative.email ?? current?.email ?? null,
    photo_logo: representative.photo_logo || current?.photo_logo || [],
    representative_profile: hasProfilePatch
      ? { ...(current?.representative_profile || {}), ...profilePatch }
      : current?.representative_profile || {},
  }
}

async function validateRepresentativeAuthorityScope(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string | null | undefined,
  body: Record<string, any>,
  currentAuthority: Record<string, any> | null,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  if (!companyId) return { ok: false as const, status: 400, code: 'COMPANY_REQUIRED', error: 'Temsil yetkisi için bağlı şirket zorunludur.' }
  const scope = buildRepresentativeAuthorityScope(body, currentAuthority)
  const scopeType = String(scope.scope_type || 'company_wide')
  if (!['company_wide', 'branch', 'organization_unit', 'facility'].includes(scopeType)) {
    return { ok: false as const, status: 400, code: 'INVALID_AUTHORITY_SCOPE_TYPE', error: 'Yetki kapsamı geçerli değil.' }
  }
  if (scopeType === 'company_wide') return null
  if (scopeType === 'branch') {
    if (!scope.branch_id) return { ok: false as const, status: 400, code: 'AUTHORITY_BRANCH_REQUIRED', error: 'Şube kapsamı için şube seçilmelidir.', details: { fieldErrors: { branch_id: 'Şube seçimi zorunludur.' } } }
    const branch = await loadScopedAuthorityReference(supabase, 'company_branches', 'id,company_id,status,record_status,is_deleted', scope.branch_id, tenantContext)
    if (!branch || branch.company_id !== companyId) return { ok: false as const, status: 400, code: 'AUTHORITY_BRANCH_INVALID', error: 'Seçilen şube bu şirkete bağlı değildir.', details: { fieldErrors: { branch_id: 'Aynı şirketten aktif şube seçin.' } } }
    if (!isActiveAuthorityReference(branch)) return { ok: false as const, status: 400, code: 'AUTHORITY_BRANCH_INACTIVE', error: 'Kapalı veya pasif şubeye yeni aktif temsil yetkisi verilemez.', details: { fieldErrors: { branch_id: 'Aktif şube seçin.' } } }
  }
  if (scopeType === 'organization_unit') {
    if (!scope.organization_unit_id) return { ok: false as const, status: 400, code: 'AUTHORITY_ORGANIZATION_UNIT_REQUIRED', error: 'Organizasyon birimi kapsamı için birim seçilmelidir.', details: { fieldErrors: { organization_unit_id: 'Organizasyon birimi zorunludur.' } } }
    const unit = await loadScopedAuthorityReference(supabase, 'organization_units', 'id,company_id,status,active,is_deleted', scope.organization_unit_id, tenantContext)
    if (!unit || unit.company_id !== companyId) return { ok: false as const, status: 400, code: 'AUTHORITY_ORGANIZATION_UNIT_INVALID', error: 'Seçilen organizasyon birimi bu şirkete bağlı değildir.', details: { fieldErrors: { organization_unit_id: 'Aynı şirketten aktif birim seçin.' } } }
    if (!isActiveAuthorityReference(unit)) return { ok: false as const, status: 400, code: 'AUTHORITY_ORGANIZATION_UNIT_INACTIVE', error: 'Kapalı veya pasif organizasyon birimi için yeni aktif temsil yetkisi verilemez.', details: { fieldErrors: { organization_unit_id: 'Aktif birim seçin.' } } }
  }
  if (scopeType === 'facility') {
    if (!scope.facility_id) return { ok: false as const, status: 400, code: 'AUTHORITY_FACILITY_REQUIRED', error: 'Tesis/lokasyon kapsamı için tesis seçilmelidir.', details: { fieldErrors: { facility_id: 'Tesis/lokasyon zorunludur.' } } }
    const facility = await loadScopedAuthorityReference(supabase, 'company_facilities', 'id,company_id,status,record_status,is_deleted', scope.facility_id, tenantContext)
    if (!facility || facility.company_id !== companyId) return { ok: false as const, status: 400, code: 'AUTHORITY_FACILITY_INVALID', error: 'Seçilen tesis/lokasyon bu şirkete bağlı değildir.', details: { fieldErrors: { facility_id: 'Aynı şirketten aktif tesis seçin.' } } }
    if (!isActiveAuthorityReference(facility)) return { ok: false as const, status: 400, code: 'AUTHORITY_FACILITY_INACTIVE', error: 'Kapalı veya pasif tesis/lokasyon için yeni aktif temsil yetkisi verilemez.', details: { fieldErrors: { facility_id: 'Aktif tesis/lokasyon seçin.' } } }
  }
  return null
}

async function loadScopedAuthorityReference(
  supabase: ReturnType<typeof createServiceClient>,
  tableName: 'company_branches' | 'organization_units' | 'company_facilities',
  select: string,
  id: string,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  let query = supabase.from(tableName).select(select).eq('id', id)
  query = applyTenantQueryScope(query, tableName, tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) {
    if (isMissingTableError(error)) return null
    throw error
  }
  return data as Record<string, any> | null
}

function isActiveAuthorityReference(row: Record<string, any>) {
  const values = [row.record_status, row.status].map(value => String(value || '').toLocaleLowerCase('tr-TR'))
  return row.is_deleted !== true
    && row.active !== false
    && !values.some(value => ['passive', 'pasif', 'closed', 'kapalı', 'kapali'].includes(value))
}

function mapRepresentativeAuthorityTransactionForDb(
  body: Record<string, any>,
  current: Record<string, any>,
  currentAuthority: Record<string, any> | null,
  transactionType: string
) {
  const authorityTypes = Array.isArray(body.authority_types)
    ? normalizeAuthorityTypes(body.authority_types)
    : normalizeAuthorityTypes(body.primary_authority_type ?? currentAuthority?.authority_types ?? current.authority_types)
  const documentFiles = Array.isArray(body.document_files)
    ? body.document_files
    : Array.isArray(body.authority_documents)
      ? body.authority_documents
      : []
  const limits = {
    transaction_limit: toNullableNumber(body.transaction_limit ?? body.authority_limit ?? currentAuthority?.transaction_limit),
    payment_approval_limit: toNullableNumber(body.payment_approval_limit ?? currentAuthority?.payment_approval_limit),
    purchase_approval_limit: toNullableNumber(body.purchase_approval_limit ?? currentAuthority?.purchase_approval_limit),
    bank_transaction_limit: toNullableNumber(body.bank_transaction_limit ?? currentAuthority?.bank_transaction_limit),
    contract_signature_limit: toNullableNumber(body.contract_signature_limit ?? currentAuthority?.contract_signature_limit),
  }
  const scope = buildRepresentativeAuthorityScope(body, currentAuthority)

  return {
    transaction_type: transactionType,
    authority_types: authorityTypes,
    signature_type: body.signature_type ?? currentAuthority?.signature_type ?? null,
    ...limits,
    currency: body.currency || currentAuthority?.currency || current.currency || 'TRY',
    limits,
    scope,
    requires_joint_signature: !!(body.requires_joint_signature ?? currentAuthority?.requires_joint_signature),
    can_approve_alone: !!(body.can_approve_alone ?? currentAuthority?.can_approve_alone),
    document_files: documentFiles,
    effective_date: body.effective_date || body.start_date || new Date().toISOString().slice(0, 10),
    end_date: body.end_date || null,
    notes: body.notes || body.termination_reason || null,
    termination_reason: body.termination_reason || null,
    reversal_transaction_id: body.reversal_transaction_id || null,
    correction_transaction_id: body.correction_transaction_id || null,
    authority_effect_status: getAuthorityEffectStatusForTransaction(transactionType, body),
    new_values: body.new_values || body,
  }
}

function buildRepresentativeAuthorityScope(
  body: Record<string, any>,
  currentAuthority: Record<string, any> | null
) {
  const currentScope = currentAuthority?.scope && typeof currentAuthority.scope === 'object' ? currentAuthority.scope : {}
  const explicitScope = body.scope && typeof body.scope === 'object' ? body.scope : {}
  const scopeType = String(body.scope_type || explicitScope.scope_type || currentScope.scope_type || 'company_wide')
  const locationScope = scopeType === 'company_wide'
    ? { branch_id: null, organization_unit_id: null, facility_id: null }
    : {
      branch_id: body.branch_id ?? explicitScope.branch_id ?? currentScope.branch_id ?? null,
      organization_unit_id: body.organization_unit_id ?? explicitScope.organization_unit_id ?? currentScope.organization_unit_id ?? null,
      facility_id: body.facility_id ?? explicitScope.facility_id ?? currentScope.facility_id ?? null,
    }

  return {
    scope_type: scopeType,
    ...locationScope,
    scope_label: body.scope_label ?? explicitScope.scope_label ?? currentScope.scope_label ?? '',
    scope_notes: body.scope_notes ?? explicitScope.scope_notes ?? currentScope.scope_notes ?? '',
    bank_authority_level: body.bank_authority_level ?? currentAuthority?.scope?.bank_authority_level ?? null,
    department_scope: body.department_scope ?? currentAuthority?.scope?.department_scope ?? null,
    gib_permissions: body.gib_permissions ?? currentAuthority?.scope?.gib_permissions ?? null,
    can_submit_declaration: !!(body.can_submit_declaration ?? currentAuthority?.scope?.can_submit_declaration),
    can_process_e_invoice: !!(body.can_process_e_invoice ?? currentAuthority?.scope?.can_process_e_invoice),
    sgk_permissions: body.sgk_permissions ?? currentAuthority?.scope?.sgk_permissions ?? null,
    can_submit_hiring_notice: !!(body.can_submit_hiring_notice ?? currentAuthority?.scope?.can_submit_hiring_notice),
    can_submit_termination_notice: !!(body.can_submit_termination_notice ?? currentAuthority?.scope?.can_submit_termination_notice),
    official_correspondence_authority: !!(body.official_correspondence_authority ?? currentAuthority?.scope?.official_correspondence_authority),
  }
}

function buildDisplayName(source: Record<string, any>, current?: Record<string, any>) {
  const kind = source.person_or_entity_type || current?.person_kind
  return kind === 'organization'
    ? source.trade_name || source.short_name || current?.display_name || current?.full_name || ''
    : [source.first_name ?? current?.first_name, source.last_name ?? current?.last_name].filter(Boolean).join(' ').trim()
}

function toNullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

async function findExistingRepresentativeForCompany(
  supabase: ReturnType<typeof createServiceClient>,
  input: {
    companyId: string
    personId?: string | null
    organizationId?: string | null
    excludeId?: string | null
    tenantContext: ReturnType<typeof resolveTenantContext>
  }
) {
  const masterColumn = input.personId ? 'person_id' : input.organizationId ? 'organization_id' : null
  const masterId = input.personId || input.organizationId || null
  if (!masterColumn || !masterId) return null

  let query = supabase
    .from('company_representatives')
    .select('id')
    .eq('company_id', input.companyId)
    .eq(masterColumn, masterId)
    .eq('is_deleted', false)
    .limit(1)
  if (input.excludeId) query = query.neq('id', input.excludeId)
  query = applyTenantQueryScope(query, 'company_representatives', input.tenantContext)
  const { data, error } = await query
  if (error) throw error
  return Array.isArray(data) ? data[0] || null : null
}

async function hydrateRepresentativeDetail(
  supabase: ReturnType<typeof createServiceClient>,
  representative: Record<string, any>,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  const currentAuthority = await fetchCurrentAuthority(supabase, representative.id, tenantContext)
  const transactionHistory = await fetchAuthorityTransactions(supabase, representative.id, tenantContext)
  const merged: Record<string, any> = currentAuthority ? {
    ...representative,
    current_authority: currentAuthority,
    authority_status: currentAuthority.authority_status || null,
    authority_record_status: currentAuthority.authority_record_status || null,
    authority_start_date: currentAuthority.effective_date || null,
    authority_end_date: currentAuthority.end_date || null,
    authority_types: currentAuthority.authority_types || representative.authority_types,
    job_title: Array.isArray(currentAuthority.authority_types) ? currentAuthority.authority_types[0] || representative.job_title : representative.job_title,
    signature_type: currentAuthority.signature_type ?? representative.signature_type,
    transaction_limit: currentAuthority.transaction_limit ?? representative.transaction_limit,
    currency: currentAuthority.currency || representative.currency,
    requires_joint_signature: currentAuthority.requires_joint_signature ?? representative.requires_joint_signature,
    can_approve_alone: currentAuthority.can_approve_alone ?? representative.can_approve_alone,
    scope_type: currentAuthority.scope?.scope_type || 'company_wide',
    branch_id: currentAuthority.scope?.branch_id || null,
    organization_unit_id: currentAuthority.scope?.organization_unit_id || null,
    facility_id: currentAuthority.scope?.facility_id || null,
    scope_label: currentAuthority.scope?.scope_label || '',
    scope_notes: currentAuthority.scope?.scope_notes || '',
    authority_transaction_history: transactionHistory,
  } : {
    ...representative,
    authority_transaction_history: transactionHistory,
  }

  return merged?.person_id
    ? hydrateMasterContact(supabase, 'person', merged)
    : merged?.organization_id
      ? hydrateMasterContact(supabase, 'organization', merged)
      : merged
}

async function fetchCurrentAuthority(
  supabase: ReturnType<typeof createServiceClient>,
  representativeId: string,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  let query = supabase
    .from('v_current_representative_authorities')
    .select(CURRENT_AUTHORITY_SELECT)
    .eq('representative_id', representativeId)
  query = applyTenantQueryScope(query, 'v_current_representative_authorities', tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) {
    if (isMissingTableError(error)) return null
    throw error
  }
  return data || null
}

async function fetchAuthorityTransactions(
  supabase: ReturnType<typeof createServiceClient>,
  representativeId: string,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  let query = supabase
    .from('company_representative_authority_transactions')
    .select(AUTHORITY_TRANSACTION_SELECT)
    .eq('representative_id', representativeId)
    .eq('is_deleted', false)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false })
  query = applyTenantQueryScope(query, 'company_representative_authority_transactions', tenantContext)
  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) return []
    throw error
  }
  return data || []
}

async function representativeHasAuthorityTransactions(
  supabase: ReturnType<typeof createServiceClient>,
  representativeId: string,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  let query = supabase
    .from('company_representative_authority_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('representative_id', representativeId)
    .eq('is_deleted', false)
  query = applyTenantQueryScope(query, 'company_representative_authority_transactions', tenantContext)
  const { count, error } = await query
  if (error) {
    if (isMissingTableError(error)) return false
    throw error
  }
  return Number(count || 0) > 0
}
