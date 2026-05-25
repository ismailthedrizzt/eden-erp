import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { requirePermission } from '@/lib/security/serverPermissions'
import { applyTenantQueryScope, resolveTenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import { diffRecord, safeCrudResponse, safeReadRecord, safeUpdateRecord } from '@/lib/crud/safeCrudService'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { duplicateOperationJsonResponse } from '@/lib/operations/apiResponse'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { operationStatusMessage } from '@/lib/operations/operationStatus'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { isMissingTableError } from '@/lib/modules/companies/companyErrors'

const REPRESENTATIVE_DETAIL_SELECT = 'id,company_id,person_id,organization_id,person_kind,source_type,source_id,display_name,full_name,phone,email,authority_types,job_title,authority_type,status,record_status,start_date,end_date,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,requires_joint_signature,can_approve_alone,bank_authority_level,department_scope,gib_permissions,can_submit_declaration,can_process_e_invoice,sgk_permissions,can_submit_hiring_notice,can_submit_termination_notice,official_correspondence_authority,is_deleted,history,photo_logo,authority_documents,representative_profile,notes,created_at,updated_at,version'
const CURRENT_AUTHORITY_SELECT = 'company_id,representative_id,display_name,person_id,organization_id,record_status,status,authority_types,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,limits,scope,requires_joint_signature,can_approve_alone,effective_date,end_date,warnings,tenant_id'
const AUTHORITY_TRANSACTION_SELECT = 'id,company_id,representative_id,person_id,organization_id,transaction_no,transaction_type,authority_types,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,limits,scope,requires_joint_signature,can_approve_alone,document_files,effective_date,end_date,approval_status,workflow_status,status,notes,warnings,reversal_transaction_id,new_values,created_at,updated_at,version'

const REPRESENTATIVE_OPERATION_CONTROLLED_FIELDS = new Set([
  'status',
  'record_status',
  'start_date',
  'end_date',
  'primary_authority_type',
  'authority_type',
  'authority_types',
  'job_title',
  'signature_type',
  'authority_limit',
  'transaction_limit',
  'payment_approval_limit',
  'purchase_approval_limit',
  'bank_transaction_limit',
  'contract_signature_limit',
  'currency',
  'bank_currency',
  'limit_currency',
  'limit_start_date',
  'limit_end_date',
  'requires_joint_signature',
  'can_approve_alone',
  'bank_authority_level',
  'department_scope',
  'gib_permissions',
  'can_submit_declaration',
  'can_process_e_invoice',
  'sgk_permissions',
  'can_submit_hiring_notice',
  'can_submit_termination_notice',
  'official_correspondence_authority',
  'current_authority',
  'authority_transaction_history',
])

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
  const next = { ...body }
  REPRESENTATIVE_OPERATION_CONTROLLED_FIELDS.forEach(field => {
    delete next[field]
  })
  return next
}

function stripRepresentativeLifecycleStatusFields(body: Record<string, any>) {
  const next = { ...body }
  delete next.status
  delete next.record_status
  delete next.current_authority
  delete next.authority_transaction_history
  return next
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
    permissionKey: 'representatives.view',
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
  const draftEditable = !isAuthorityTransaction
    ? await representativeAllowsDraftControlledEdit(supabase, id, tenantContext)
    : false
  const body = isAuthorityTransaction
    ? rawPatch
    : draftEditable
      ? stripRepresentativeLifecycleStatusFields(rawPatch)
      : stripRepresentativeOperationControlledFields(rawPatch)

  const permission = await requirePermission(request, supabase, 'representatives.edit')
  if (permission instanceof NextResponse) return permission

  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: tenantContext.tenantId,
    companyId: body.company_id || null,
    moduleKey: 'sirket',
    entityType: 'company_representative',
    entityId: id,
    operationType: isAuthorityTransaction ? 'representative.authority.transaction' : 'representative.update',
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

  try {
    const result = isAuthorityTransaction
      ? await applyAuthorityTransaction({
        supabase,
        request,
        representativeId: id,
        body,
        baseVersion,
        baseUpdatedAt,
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

    return NextResponse.json({
      data: result.data,
      ...(operation ? {
        operation_id: operation.id,
        operation_status: 'completed',
        message: operationStatusMessage('completed'),
      } : {}),
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
  const permission = await requirePermission(request, supabase, 'representatives.delete')
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

  const currentAuthority = await fetchCurrentAuthority(supabase, id, tenantContext)
  const effectiveStatus = String(currentAuthority?.record_status || current.record_status || '').toLocaleLowerCase('tr-TR')
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
      const mapped = mapRepresentativeForDb(patch, current)
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
  requestedBy,
  tenantContext,
}: {
  supabase: ReturnType<typeof createServiceClient>
  request: NextRequest
  representativeId: string
  body: Record<string, any>
  baseVersion: number | null
  baseUpdatedAt: string | null
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
  const recordStatus = normalizeRecordStatus(current.record_status || current.status)
  const lifecycleViolation = validateRepresentativeLifecycleTransition(transactionType, recordStatus)
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
  const limits = {
    transaction_limit: toNullableNumber(body.transaction_limit ?? body.authority_limit),
    payment_approval_limit: toNullableNumber(body.payment_approval_limit),
    purchase_approval_limit: toNullableNumber(body.purchase_approval_limit),
    bank_transaction_limit: toNullableNumber(body.bank_transaction_limit),
    contract_signature_limit: toNullableNumber(body.contract_signature_limit),
  }
  const scopePayload = {
    bank_authority_level: body.bank_authority_level || null,
    department_scope: body.department_scope || null,
    gib_permissions: body.gib_permissions || null,
    can_submit_declaration: !!body.can_submit_declaration,
    can_process_e_invoice: !!body.can_process_e_invoice,
    sgk_permissions: body.sgk_permissions || null,
    can_submit_hiring_notice: !!body.can_submit_hiring_notice,
    can_submit_termination_notice: !!body.can_submit_termination_notice,
    official_correspondence_authority: !!body.official_correspondence_authority,
  }
  const effectiveDate = body.effective_date || body.start_date || new Date().toISOString().slice(0, 10)
  const approvalStatus = body.approval_status || 'approved'
  const workflowStatus = body.workflow_status || approvalStatus
  const { count } = await supabase
    .from('company_representative_authority_transactions')
    .select('id', { count: 'exact', head: true })

  const transactionRow = withTenantInsertScopeForTable({
    company_id: current.company_id,
    representative_id: representativeId,
    person_id: current.person_id || null,
    organization_id: current.organization_id || null,
    transaction_no: `RT-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(5, '0')}`,
    transaction_type: transactionType,
    authority_types: authorityTypes,
    signature_type: body.signature_type || null,
    transaction_limit: limits.transaction_limit,
    payment_approval_limit: limits.payment_approval_limit,
    purchase_approval_limit: limits.purchase_approval_limit,
    bank_transaction_limit: limits.bank_transaction_limit,
    contract_signature_limit: limits.contract_signature_limit,
    currency: body.currency || current.currency || 'TRY',
    limits,
    scope: scopePayload,
    requires_joint_signature: !!body.requires_joint_signature,
    can_approve_alone: !!body.can_approve_alone,
    document_files: documentFiles,
    effective_date: effectiveDate,
    end_date: body.end_date || null,
    approval_status: approvalStatus,
    workflow_status: workflowStatus,
    status: approvalStatus === 'approved' ? 'active' : 'draft',
    notes: body.notes || null,
    warnings: [],
    reversal_transaction_id: body.reversal_transaction_id || null,
    new_values: body.new_values || body,
    approved_by: approvalStatus === 'approved' ? requestedBy || null : null,
    approved_at: approvalStatus === 'approved' ? new Date().toISOString() : null,
    created_by: requestedBy || null,
    updated_by: requestedBy || null,
  }, 'company_representative_authority_transactions', tenantContext)

  const { data: transaction, error: transactionError } = await supabase
    .from('company_representative_authority_transactions')
    .insert(transactionRow)
    .select(AUTHORITY_TRANSACTION_SELECT)
    .single()

  if (transactionError) {
    return { ok: false as const, status: 500, code: transactionError.code || 'AUTHORITY_TRANSACTION_CREATE_FAILED', error: transactionError.message }
  }

  if (approvalStatus === 'approved') {
    const statusPatch = representativeStatusPatchForTransaction(transactionType, effectiveDate, body.end_date)
    let updateQuery = supabase
      .from('company_representatives')
      .update({
        ...statusPatch,
        updated_at: new Date().toISOString(),
        version: Number(current.version || 1) + 1,
        history: buildHistory(current, statusPatch),
      })
      .eq('id', representativeId)
    updateQuery = applyTenantQueryScope(updateQuery, 'company_representatives', tenantContext)
    const { error: updateError } = await updateQuery
    if (updateError) {
      return { ok: false as const, status: 500, code: updateError.code || 'REPRESENTATIVE_STATUS_UPDATE_FAILED', error: updateError.message }
    }
  }

  const refreshed = await safeReadRecord({
    supabase,
    request,
    tableName: 'company_representatives',
    recordId: representativeId,
    permissionKey: ['representatives.view', 'companies.view'],
    select: REPRESENTATIVE_DETAIL_SELECT,
    afterRead: async ({ record }) => hydrateRepresentativeDetail(supabase, {
      ...record,
      last_authority_transaction: transaction,
    }, tenantContext),
  })
  return refreshed
}

function representativeStatusPatchForTransaction(transactionType: string, effectiveDate: string, endDate?: string | null) {
  if (transactionType === 'Askıya Alma') {
    return { status: 'Askıda', record_status: 'suspended', start_date: effectiveDate, end_date: endDate || null }
  }
  if (transactionType === 'Sonlandırma') {
    return { status: 'Sona Erdi', record_status: 'terminated', end_date: endDate || effectiveDate }
  }
  if (transactionType === 'Ters Kayıt') {
    return { status: 'Aktif', record_status: 'active' }
  }
  return { status: 'Aktif', record_status: 'active', start_date: effectiveDate, end_date: endDate || null }
}

function normalizeRecordStatus(value: unknown) {
  const text = String(value || '').toLocaleLowerCase('tr-TR')
  if (text.includes('ask')) return 'suspended'
  if (text.includes('sona') || text.includes('son')) return 'terminated'
  if (text.includes('aktif') || text === 'active') return 'active'
  if (text.includes('pasif') || text === 'passive') return 'passive'
  return text || 'draft'
}

function validateRepresentativeLifecycleTransition(transactionType: string, recordStatus: string) {
  if (transactionType === 'Temsilcilik Başlatma' && recordStatus !== 'draft') {
    return { ok: false as const, status: 409, code: 'REPRESENTATIVE_ACTIVATION_REQUIRES_DRAFT', error: 'Temsilci Yetkilendirme / Aktive Etme yalnızca Taslak kayıtlar için çalışır.' }
  }
  if (['Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Limit Değişikliği', 'Düzeltme Kaydı'].includes(transactionType) && recordStatus !== 'active') {
    return { ok: false as const, status: 409, code: 'REPRESENTATIVE_AUTHORITY_CHANGE_REQUIRES_ACTIVE', error: 'Yetki, limit, kurum veya imza değişiklikleri yalnızca Aktif temsilciler için operation olarak yapılabilir.' }
  }
  if (transactionType === 'Askıya Alma' && recordStatus !== 'active') {
    return { ok: false as const, status: 409, code: 'REPRESENTATIVE_SUSPEND_REQUIRES_ACTIVE', error: 'Askıya alma yalnızca Aktif temsilciler için yapılabilir.' }
  }
  if (transactionType === 'Sonlandırma' && !['active', 'suspended'].includes(recordStatus)) {
    return { ok: false as const, status: 409, code: 'REPRESENTATIVE_TERMINATE_REQUIRES_ACTIVE', error: 'Temsilcilik Sonlandırma yalnızca Aktif veya Askıda temsilciler için yapılabilir.' }
  }
  return null
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

function mapRepresentativeForDb(representative: Record<string, any>, current?: Record<string, any>) {
  const profilePatch = stripMasterDataForRoleProfile(representative)
  const hasProfilePatch = Object.keys(profilePatch).length > 0
  const displayName = representative.display_name || buildDisplayName(representative, current) || current?.display_name || current?.full_name || 'Temsilci'
  const authorityTypes = normalizeAuthorityTypes(representative.authority_types ?? representative.primary_authority_type ?? representative.authority_type ?? current?.authority_types)

  return {
    company_id: representative.company_id || current?.company_id,
    full_name: displayName,
    person_kind: representative.person_or_entity_type || current?.person_kind || 'person',
    source_type: representative.source_type || current?.source_type,
    source_id: representative.source_id || current?.source_id,
    display_name: displayName,
    start_date: representative.start_date ?? current?.start_date ?? null,
    end_date: representative.end_date ?? current?.end_date ?? null,
    authority_types: authorityTypes,
    authority_type: authorityTypes[0] || current?.authority_type || 'other',
    job_title: representative.job_title || representative.primary_authority_type || authorityTypes[0] || current?.job_title || null,
    signature_type: representative.signature_type ?? current?.signature_type ?? null,
    transaction_limit: toNullableNumber(representative.transaction_limit ?? representative.authority_limit ?? current?.transaction_limit),
    payment_approval_limit: toNullableNumber(representative.payment_approval_limit ?? current?.payment_approval_limit),
    purchase_approval_limit: toNullableNumber(representative.purchase_approval_limit ?? current?.purchase_approval_limit),
    bank_transaction_limit: toNullableNumber(representative.bank_transaction_limit ?? current?.bank_transaction_limit),
    contract_signature_limit: toNullableNumber(representative.contract_signature_limit ?? current?.contract_signature_limit),
    currency: representative.currency || current?.currency || 'TRY',
    requires_joint_signature: representative.requires_joint_signature ?? current?.requires_joint_signature ?? false,
    can_approve_alone: representative.can_approve_alone ?? current?.can_approve_alone ?? false,
    bank_authority_level: representative.bank_authority_level ?? current?.bank_authority_level ?? null,
    department_scope: representative.department_scope ?? current?.department_scope ?? null,
    gib_permissions: representative.gib_permissions ?? current?.gib_permissions ?? null,
    can_submit_declaration: representative.can_submit_declaration ?? current?.can_submit_declaration ?? false,
    can_process_e_invoice: representative.can_process_e_invoice ?? current?.can_process_e_invoice ?? false,
    sgk_permissions: representative.sgk_permissions ?? current?.sgk_permissions ?? null,
    can_submit_hiring_notice: representative.can_submit_hiring_notice ?? current?.can_submit_hiring_notice ?? false,
    can_submit_termination_notice: representative.can_submit_termination_notice ?? current?.can_submit_termination_notice ?? false,
    official_correspondence_authority: representative.official_correspondence_authority ?? current?.official_correspondence_authority ?? false,
    notes: representative.notes ?? current?.notes ?? null,
    phone: representative.phone ?? current?.phone ?? null,
    email: representative.email ?? current?.email ?? null,
    photo_logo: representative.photo_logo || current?.photo_logo || [],
    authority_documents: representative.authority_documents || current?.authority_documents || [],
    representative_profile: hasProfilePatch
      ? { ...(current?.representative_profile || {}), ...profilePatch }
      : current?.representative_profile || {},
    is_deleted: !!current?.is_deleted,
    deleted_at: current?.deleted_at ?? null,
    deleted_by: current?.deleted_by ?? null,
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

async function representativeAllowsDraftControlledEdit(
  supabase: ReturnType<typeof createServiceClient>,
  representativeId: string,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  let query = supabase
    .from('company_representatives')
    .select('id,record_status,is_deleted')
    .eq('id', representativeId)
  query = applyTenantQueryScope(query, 'company_representatives', tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error || !data || data.is_deleted) return false
  return String(data.record_status || '').toLocaleLowerCase('tr-TR') === 'draft'
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
    authority_types: currentAuthority.authority_types || representative.authority_types,
    job_title: Array.isArray(currentAuthority.authority_types) ? currentAuthority.authority_types[0] || representative.job_title : representative.job_title,
    status: currentAuthority.status || representative.status,
    record_status: currentAuthority.record_status || representative.record_status,
    start_date: currentAuthority.effective_date || representative.start_date,
    end_date: currentAuthority.end_date || representative.end_date,
    signature_type: currentAuthority.signature_type ?? representative.signature_type,
    transaction_limit: currentAuthority.transaction_limit ?? representative.transaction_limit,
    currency: currentAuthority.currency || representative.currency,
    requires_joint_signature: currentAuthority.requires_joint_signature ?? representative.requires_joint_signature,
    can_approve_alone: currentAuthority.can_approve_alone ?? representative.can_approve_alone,
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
