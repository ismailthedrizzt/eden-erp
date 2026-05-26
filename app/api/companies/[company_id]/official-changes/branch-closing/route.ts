import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope } from '@/lib/tenancy/server'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import {
  OFFICIAL_BRANCH_SELECT,
  OFFICIAL_CHANGE_EVENT_TYPES,
  OFFICIAL_CHANGE_OPERATION_TYPES,
  OfficialDocumentMetaSchema,
  OfficialDocumentSchema,
  buildBranchClosingPrecheck,
  duplicateOfficialChangeResponse,
  emptyToNull,
  ensureOfficialChangeAccess,
  insertOfficialChangeTransaction,
  insertOfficialLifecycleEvent,
  isActiveBranch,
  normalizeDocuments,
  normalizeOptionalString,
  officialChangeError,
  officialChangeSuccess,
  setOrganizationUnitPassive,
  validateOfficialDates,
} from '../_shared'

const emptyStringToUndefined = (value: unknown) => value === '' ? undefined : value
const optionalUuid = z.preprocess(emptyStringToUndefined, z.string().uuid().optional().nullable())

const BranchClosingSchema = z.object({
  branch_id: z.string().uuid(),
  closing_reason: z.string().min(1).max(500),
  closing_decision_date: z.string().min(1),
  closing_registration_date: z.string().optional().nullable(),
  trade_registry_gazette_date: z.string().optional().nullable(),
  trade_registry_gazette_number: z.string().optional().nullable(),
  sgk_closing_notification: z.boolean().default(false),
  tax_office_notification: z.boolean().default(false),
  organization_unit_action: z.enum(['deactivate', 'reassign', 'keep_open']),
  target_organization_unit_id: optionalUuid,
  facility_action: z.enum(['deactivate', 'keep_open', 'reuse']),
  notes: z.string().optional().nullable(),
  document_files: z.array(OfficialDocumentSchema).default([]),
  document_meta: OfficialDocumentMetaSchema,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, 'companies.edit')
  if (access.response) return access.response

  const rawBody = await request.json().catch(() => ({}))
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const parsed = BranchClosingSchema.safeParse(stripOperationControlFields(rawBody))
  if (!parsed.success) return officialChangeError('Şube kapanışı verileri geçerli değil.', 'VALIDATION_FAILED', 400, { validation: parsed.error.flatten() })
  const input = parsed.data
  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: access.tenantContext.tenantId,
    companyId,
    moduleKey: 'sirket',
    entityType: 'company_branch',
    entityId: input.branch_id,
    operationType: OFFICIAL_CHANGE_OPERATION_TYPES.branch_closing,
    clientRequestId,
    baseVersion,
    baseUpdatedAt,
    requestedBy: access.userId || null,
    payload: input,
  })
  if (operationCreate.ok && operationCreate.duplicate) return duplicateOfficialChangeResponse(operationCreate.operation)
  if (!operationCreate.ok && !operationCreate.missingInfrastructure) return officialChangeError(operationCreate.error, operationCreate.code || 'OPERATION_REQUEST_FAILED', 500)
  const operation = operationCreate.ok ? operationCreate.operation : null
  if (operation) await operationService.markProcessing(operation.id)
  const fail = async (message: string, code: string, status = 400, details?: Record<string, unknown>) => {
    if (operation) await operationService.markFailed(operation.id, { code, message, details: details || {} })
    return officialChangeError(message, code, status, details, operation ? { id: operation.id, operation_status: 'failed' } : null)
  }

  try {
    const precheck = await buildBranchClosingPrecheck(supabase, companyId, access.tenantContext, input.branch_id)
    if (!precheck.ok) return fail(precheck.message, 'BRANCH_CLOSING_PRECHECK_FAILED', 409, { reasons: precheck.blocking_reasons, warnings: precheck.warnings })
    const branch = precheck.selected_branch
    if (!branch) return fail('Kapatılacak şube bulunamadı.', 'BRANCH_NOT_FOUND', 404)
    if (!isActiveBranch(branch)) return fail('Kapalı veya pasif şube tekrar kapatılamaz.', 'BRANCH_ALREADY_CLOSED', 409)
    if (input.organization_unit_action === 'reassign' && !input.target_organization_unit_id) return fail('Organizasyon birimi başka birime bağlanacaksa hedef birim seçilmelidir.', 'TARGET_ORGANIZATION_UNIT_REQUIRED', 400)
    const dateValidation = validateOfficialDates({ decisionDate: input.closing_decision_date, registrationDate: input.closing_registration_date, tradeRegistryGazetteDate: input.trade_registry_gazette_date })
    if (!dateValidation.ok) return fail(dateValidation.message, dateValidation.code, 400)

    const documents = normalizeDocuments(input.document_files, input.document_meta)
    const previousDocumentFiles = Array.isArray(branch.document_files) ? branch.document_files : []
    const now = new Date().toISOString()
    const updatePayload = {
      status: 'closed',
      record_status: 'closed',
      closing_decision_date: emptyToNull(input.closing_decision_date),
      closing_registration_date: emptyToNull(input.closing_registration_date),
      trade_registry_gazette_date: emptyToNull(input.trade_registry_gazette_date),
      trade_registry_gazette_number: normalizeOptionalString(input.trade_registry_gazette_number),
      end_date: emptyToNull(input.closing_registration_date || input.closing_decision_date),
      document_files: [...previousDocumentFiles, ...documents.map(document => ({ ...document, closing_document: true }))],
      metadata_json: {
        ...(branch.metadata_json || {}),
        closing_reason: input.closing_reason,
        sgk_closing_notification: input.sgk_closing_notification,
        tax_office_notification: input.tax_office_notification,
        organization_unit_action: input.organization_unit_action,
        target_organization_unit_id: input.target_organization_unit_id || null,
        facility_action: input.facility_action,
        closed_operation_id: operation?.id || null,
      },
      notes: normalizeOptionalString(input.notes) || branch.notes || null,
      updated_by: access.userId || null,
      updated_at: now,
      version: Number(branch.version || 1) + 1,
    }
    let updateQuery = supabase.from('company_branches').update(updatePayload).eq('id', branch.id)
    updateQuery = applyTenantQueryScope(updateQuery, 'company_branches', access.tenantContext)
    const { data: updatedBranch, error: updateError } = await updateQuery.select(OFFICIAL_BRANCH_SELECT).single()
    if (updateError) throw updateError
    if (input.organization_unit_action === 'deactivate' && branch.organization_unit_id) {
      await setOrganizationUnitPassive({ supabase, unitId: branch.organization_unit_id, tenantContext: access.tenantContext, endDate: input.closing_registration_date || input.closing_decision_date })
    }
    const changedFields = Object.keys(updatePayload)
    const oldValues = Object.fromEntries(changedFields.map(field => [field, branch[field] ?? null]))
    const updated = updatedBranch as Record<string, any>
    const newValues = Object.fromEntries(changedFields.map(field => [field, updated[field] ?? null]))
    const transaction = await insertOfficialChangeTransaction({
      supabase,
      companyId,
      branchId: branch.id,
      tenantContext: access.tenantContext,
      userId: access.userId,
      operationId: operation?.id || null,
      transactionType: 'branch_closing',
      oldValues,
      newValues,
      changedFields,
      documentFiles: documents,
      decisionDate: input.closing_decision_date,
      registrationDate: input.closing_registration_date,
      tradeRegistryGazetteDate: input.trade_registry_gazette_date,
      tradeRegistryGazetteNumber: input.trade_registry_gazette_number,
      effectiveDate: input.closing_registration_date || input.closing_decision_date,
      notes: input.notes || input.closing_reason,
      warnings: [...(precheck.warnings || []), ...dateValidation.warnings],
    })
    await insertOfficialLifecycleEvent({ supabase, companyId, tenantContext: access.tenantContext, userId: access.userId, transaction, eventType: 'company_branch_closing_completed', eventDate: input.closing_registration_date || input.closing_decision_date })
    const result = { company: precheck.current, transaction, branch: updated, organization_unit: input.organization_unit_action === 'deactivate' ? { id: branch.organization_unit_id, status: 'Pasif' } : null, facility: null }
    if (operation) {
      await operationService.markCompleted(operation.id, result, [...(precheck.warnings || []), ...dateValidation.warnings])
      await new OutboxEventService(supabase as any).enqueue({
        tenantId: access.tenantContext.tenantId,
        companyId,
        moduleKey: 'sirket',
        eventType: OFFICIAL_CHANGE_EVENT_TYPES.branch_closing,
        aggregateType: 'company_branch',
        aggregateId: branch.id,
        operationId: operation.id,
        payload: { company_id: companyId, branch_id: branch.id, transaction_id: transaction.id, organization_unit_action: input.organization_unit_action, facility_action: input.facility_action },
      }).catch(() => null)
    }
    return officialChangeSuccess(result, operation ? { id: operation.id, operation_status: 'completed' } : null)
  } catch (error: any) {
    const message = error?.message || 'Şube kapanışı tamamlanamadı.'
    if (operation) await operationService.markFailed(operation.id, { code: error?.code || 'BRANCH_CLOSING_FAILED', message })
    return officialChangeError(message, error?.code || 'BRANCH_CLOSING_FAILED', 500, undefined, operation ? { id: operation.id, operation_status: 'failed' } : null)
  }
}
