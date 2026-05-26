import 'server-only'

import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId } from '@/lib/operations/idempotency'
import { executeWithTransactionBoundary } from '@/lib/operations/transactionBoundary'
import { markBranchClosingPartialFailure } from '@/lib/operations/transaction-boundary/compensation'
import { BRANCH_PERMISSIONS } from '@/lib/modules/companies/branchPermissions'
import { AuditLogService } from '@/lib/audit/auditLogService'
import { buildAuditContextFromRequest } from '@/lib/audit/auditContext'
import { runIntegrityForOperation } from '@/lib/integrity/integrityChecker'
import { integrityWarningsForMetadata } from '@/lib/integrity/integrityGuards'
import { unwrapDomainResult } from '@/lib/domains/domainServiceResponse'
import { closeBranch } from '@/lib/domains/branches/branch.service'
import {
  keepOrganizationUnitOpenAfterBranchClosing,
  reassignOrganizationUnit,
  setOrganizationUnitPassive,
} from '@/lib/domains/organization/organization.service'
import {
  keepFacilityOpenAfterBranchClosing,
  markFacilityReusable,
  setFacilityPassive,
} from '@/lib/domains/facilities/facility.service'
import {
  OFFICIAL_CHANGE_EVENT_TYPES,
  OFFICIAL_CHANGE_OPERATION_TYPES,
  OfficialDocumentMetaSchema,
  OfficialDocumentSchema,
  buildBranchClosingPrecheck,
  emptyToNull,
  ensureOfficialChangeAccess,
  insertOfficialChangeTransaction,
  insertOfficialLifecycleEvent,
  isActiveBranch,
  normalizeDocuments,
  validateOfficialDates,
} from '@/app/api/companies/[company_id]/official-changes/_shared'
import {
  completeOfficialChangeOperation,
  createOfficialChangeOperation,
  enqueueOfficialChangeOutbox,
  failOfficialChangeOperation,
} from './companyOfficialChange.orchestrator'
import { orchestratorError, resultFromNextResponse } from './orchestratorResponse'
import type { OperationOrchestratorResult } from './types'

const emptyStringToUndefined = (value: unknown) => value === '' ? undefined : value
const optionalUuid = z.preprocess(emptyStringToUndefined, z.string().uuid().optional().nullable())

export const CompanyBranchClosingSchema = z.object({
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

export type CompanyBranchClosingInput = z.infer<typeof CompanyBranchClosingSchema>

type BranchClosingMutationResult = {
  company: Record<string, any>
  transaction: Record<string, any>
  branch: Record<string, any>
  organization_unit: Record<string, any> | null
  facility: Record<string, any> | null
  warnings: string[]
}

export async function runCompanyBranchClosingOrchestrator({
  request,
  companyId,
  input,
  rawBody,
}: {
  request: NextRequest
  companyId: string
  input: CompanyBranchClosingInput
  rawBody: Record<string, any>
}): Promise<OperationOrchestratorResult> {
  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, BRANCH_PERMISSIONS.closingStart, 'companies.edit')
  if (access.response) return resultFromNextResponse(access.response)

  const baseVersion = resolveBaseVersion(rawBody) ?? (rawBody.base_branch_version === undefined ? null : Number(rawBody.base_branch_version))
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody) ?? (rawBody.base_branch_updated_at ? String(rawBody.base_branch_updated_at) : null)
  const operationCreate = await createOfficialChangeOperation({
    supabase,
    tenantContext: access.tenantContext,
    companyId,
    entityType: 'company_branch',
    entityId: input.branch_id,
    operationType: OFFICIAL_CHANGE_OPERATION_TYPES.branch_closing,
    clientRequestId: resolveClientRequestId(request, rawBody),
    baseVersion,
    baseUpdatedAt,
    requestedBy: access.userId || null,
    payload: input,
  })
  if ('result' in operationCreate) return operationCreate.result

  const operation = operationCreate.operation
  const operationService = operationCreate.service
  const audit = new AuditLogService(supabase, access.tenantContext)
  const auditContext = buildAuditContextFromRequest(request, access.tenantContext, {
    companyId,
    branchId: input.branch_id,
    moduleKey: 'branches',
    entityType: 'company_branch',
    entityId: input.branch_id,
    operationId: operation?.id || null,
    userId: access.userId || null,
  })
  await audit.recordOperationStart({
    context: auditContext,
    actionKey: 'branch_closing',
    summary: 'Sube Kapanisi islemi baslatildi.',
    newValues: {
      branch_id: input.branch_id,
      closing_reason: input.closing_reason,
      organization_unit_action: input.organization_unit_action,
      facility_action: input.facility_action,
    },
  }).catch(() => null)

  try {
    const integrity = await runIntegrityForOperation('branch_closing', {
      supabase,
      tenantContext: access.tenantContext,
      userId: access.userId || null,
      companyId,
      branchId: input.branch_id,
      operationKey: 'branch_closing',
      entityType: 'company_branch',
      entityId: input.branch_id,
      payload: input,
    })
    if (!integrity.ok) {
      await audit.recordOperationFail({
        context: auditContext,
        actionKey: 'branch_closing',
        summary: 'Sube Kapanisi veri tutarliligi nedeniyle baslatilamadi.',
        reason: integrity.blockingReasons[0] || 'Veri tutarliligi kontrolu islemi engelledi.',
        metadata: { integrity: integrityWarningsForMetadata(integrity) },
      }).catch(() => null)
      return failOfficialChangeOperation({
        service: operationService,
        operation,
        message: integrity.blockingReasons[0] || 'Bu islem veri tutarliligi nedeniyle su anda baslatilamaz.',
        code: 'DATA_INTEGRITY_BLOCKED',
        status: 409,
        details: {
          blocking_reasons: integrity.blockingReasons,
          warnings: integrity.warnings,
          suggested_actions: integrity.suggestedActions,
          results: integrity.results,
        },
      })
    }

    const boundary = await executeWithTransactionBoundary<BranchClosingMutationResult>({
      supabase,
      key: 'company_branch_closing',
      rpcName: 'perform_company_branch_closing',
      rpcPayload: {
        tenant_id: access.tenantContext.tenantId,
        company_id: companyId,
        branch_id: input.branch_id,
        user_id: access.userId || null,
        operation_id: operation?.id || null,
        process_instance_id: rawBody.process_instance_id || null,
        branch_update_payload: input,
        organization_unit_action_payload: {
          action: input.organization_unit_action,
          target_organization_unit_id: input.target_organization_unit_id || null,
        },
        facility_action_payload: { action: input.facility_action },
        transaction_payload: { transaction_type: 'branch_closing' },
        lifecycle_event_payload: { event_type: 'company_branch_closing_completed' },
        outbox_payload: { event_type: OFFICIAL_CHANGE_EVENT_TYPES.branch_closing },
        base_version: baseVersion,
        base_updated_at: baseUpdatedAt,
        payload: input,
      },
      fallback: () => performBranchClosingApplicationFlow({
        supabase,
        companyId,
        input,
        tenantContext: access.tenantContext,
        userId: access.userId || null,
        operationId: operation?.id || null,
        baseVersion,
        baseUpdatedAt,
      }),
      compensation: async (_partialResult, error) => {
        await markBranchClosingPartialFailure({
          supabase,
          tenantContext: access.tenantContext,
          branchId: input.branch_id,
          reason: error instanceof Error ? error.message : 'Sube kapanisi tamamlanamadi.',
        })
      },
    })

    if (!boundary.ok) {
      await audit.recordOperationFail({
        context: auditContext,
        actionKey: 'branch_closing',
        summary: 'Sube Kapanisi islemi tamamlanamadi.',
        reason: boundary.error,
        metadata: { code: boundary.code, details: boundary.details },
      }).catch(() => null)
      return failOfficialChangeOperation({
        service: operationService,
        operation,
        message: boundary.error,
        code: boundary.code,
        status: boundary.status,
        details: boundary.details,
      })
    }

    const result = boundary.data
    const warnings = [...(result.warnings || []), ...integrity.warnings]
    await enqueueOfficialChangeOutbox({
      supabase,
      tenantContext: access.tenantContext,
      companyId,
      eventType: OFFICIAL_CHANGE_EVENT_TYPES.branch_closing,
      aggregateType: 'company_branch',
      aggregateId: result.branch.id,
      operation,
      payload: {
        company_id: companyId,
        branch_id: result.branch.id,
        transaction_id: result.transaction.id,
        organization_unit_action: input.organization_unit_action,
        facility_action: input.facility_action,
        transaction_boundary: boundary.used,
        integrity_warnings: integrity.warnings,
      },
    })

    await audit.recordOperationComplete({
      context: auditContext,
      actionKey: 'branch_closing',
      summary: `${result.branch.branch_name || 'Sube'} kapatildi.`,
      oldValues: result.transaction.old_values || result.transaction.old_values_json || null,
      newValues: result.transaction.new_values || result.transaction.new_values_json || result.branch,
      changedFields: result.transaction.changed_fields || [],
      metadata: {
        transaction_id: result.transaction.id,
        organization_unit_action: input.organization_unit_action,
        facility_action: input.facility_action,
        transaction_boundary: boundary.used,
        integrity: integrityWarningsForMetadata(integrity),
      },
    }).catch(() => null)

    return completeOfficialChangeOperation({
      service: operationService,
      operation,
      data: {
        company: result.company,
        transaction: result.transaction,
        branch: result.branch,
        organization_unit: result.organization_unit,
        facility: result.facility,
      },
      warnings,
    })
  } catch (error: any) {
    await audit.recordOperationFail({
      context: auditContext,
      actionKey: 'branch_closing',
      summary: 'Sube Kapanisi islemi tamamlanamadi.',
      reason: error?.message || 'Sube kapanisi tamamlanamadi.',
      metadata: { code: error?.code, details: error?.details },
    }).catch(() => null)
    return failOfficialChangeOperation({
      service: operationService,
      operation,
      message: error?.message || 'Sube kapanisi tamamlanamadi.',
      code: error?.code || 'BRANCH_CLOSING_FAILED',
      status: error?.status || 500,
      details: error?.details,
    })
  }
}

async function performBranchClosingApplicationFlow({
  supabase,
  companyId,
  input,
  tenantContext,
  userId,
  operationId,
  baseVersion,
  baseUpdatedAt,
}: {
  supabase: ReturnType<typeof createServiceClient>
  companyId: string
  input: CompanyBranchClosingInput
  tenantContext: any
  userId?: string | null
  operationId?: string | null
  baseVersion?: number | null
  baseUpdatedAt?: string | null
}): Promise<BranchClosingMutationResult> {
  const precheck = await buildBranchClosingPrecheck(supabase, companyId, tenantContext, input.branch_id)
  if (!precheck.ok) {
    throw Object.assign(new Error(precheck.message), {
      code: 'BRANCH_CLOSING_PRECHECK_FAILED',
      status: 409,
      details: { reasons: precheck.blocking_reasons, warnings: precheck.warnings },
    })
  }

  const branch = precheck.selected_branch
  if (!branch) throw validationError('Kapatilacak sube bulunamadi.', 'BRANCH_NOT_FOUND', 404)
  if (!isActiveBranch(branch)) throw validationError('Kapali veya pasif sube tekrar kapatilamaz.', 'BRANCH_ALREADY_CLOSED', 409)
  if (input.organization_unit_action === 'reassign' && !input.target_organization_unit_id) {
    throw validationError('Organizasyon birimi baska birime baglanacaksa hedef birim secilmelidir.', 'TARGET_ORGANIZATION_UNIT_REQUIRED', 400)
  }
  const conflictDetails = {
    current_version: branch.version,
    base_version: baseVersion ?? null,
    current_updated_at: branch.updated_at ?? null,
    base_updated_at: baseUpdatedAt ?? null,
  }
  if (baseVersion !== null && baseVersion !== undefined && Number(branch.version || 0) !== Number(baseVersion)) {
    throw validationError('Sube kaydi bu islem hazirlanirken degismis. Lutfen kaydi yenileyip tekrar deneyin.', 'VERSION_CONFLICT', 409, conflictDetails)
  }
  if (baseUpdatedAt && branch.updated_at && new Date(branch.updated_at).getTime() !== new Date(baseUpdatedAt).getTime()) {
    throw validationError('Sube kaydi bu islem hazirlanirken degismis. Lutfen kaydi yenileyip tekrar deneyin.', 'VERSION_CONFLICT', 409, conflictDetails)
  }

  const dateValidation = validateOfficialDates({
    decisionDate: input.closing_decision_date,
    registrationDate: input.closing_registration_date,
    tradeRegistryGazetteDate: input.trade_registry_gazette_date,
  })
  if (!dateValidation.ok) throw validationError(dateValidation.message, dateValidation.code, 400)

  const documents = normalizeDocuments(input.document_files, input.document_meta)
  const closingResult = unwrapDomainResult(await closeBranch({ supabase, tenantContext, userId, companyId, operationId }, branch.id, {
    closing_reason: input.closing_reason,
    closing_decision_date: emptyToNull(input.closing_decision_date),
    closing_registration_date: emptyToNull(input.closing_registration_date),
    trade_registry_gazette_date: emptyToNull(input.trade_registry_gazette_date),
    trade_registry_gazette_number: input.trade_registry_gazette_number,
    sgk_closing_notification: input.sgk_closing_notification,
    tax_office_notification: input.tax_office_notification,
    organization_unit_action: input.organization_unit_action,
    target_organization_unit_id: input.target_organization_unit_id || null,
    facility_action: input.facility_action,
    notes: input.notes || null,
    document_files: documents,
    baseVersion,
    baseUpdatedAt,
  }))

  const endDate = input.closing_registration_date || input.closing_decision_date
  const organizationUnit = branch.organization_unit_id
    ? input.organization_unit_action === 'deactivate'
      ? unwrapDomainResult(await setOrganizationUnitPassive({ supabase, tenantContext, userId, companyId, operationId }, branch.organization_unit_id, { endDate }))
      : input.organization_unit_action === 'reassign'
        ? unwrapDomainResult(await reassignOrganizationUnit({ supabase, tenantContext, userId, companyId, operationId }, branch.organization_unit_id, input.target_organization_unit_id || null, { companyId, endDate })).unit
        : unwrapDomainResult(await keepOrganizationUnitOpenAfterBranchClosing({ supabase, tenantContext, userId, companyId, operationId }, branch.organization_unit_id, { endDate }))
    : null

  const facility = branch.facility_id
    ? input.facility_action === 'deactivate'
      ? unwrapDomainResult(await setFacilityPassive({ supabase, tenantContext, userId, companyId, operationId }, branch.facility_id, { endDate }))
      : input.facility_action === 'reuse'
        ? unwrapDomainResult(await markFacilityReusable({ supabase, tenantContext, userId, companyId, operationId }, branch.facility_id, { endDate }))
        : unwrapDomainResult(await keepFacilityOpenAfterBranchClosing({ supabase, tenantContext, userId, companyId, operationId }, branch.facility_id, { endDate }))
    : null

  const changedFields = closingResult.changedFields
  const oldValues = closingResult.oldValues
  const updated = closingResult.branch
  const newValues = closingResult.newValues
  const warnings = [...(precheck.warnings || []), ...dateValidation.warnings]
  const transaction = await insertOfficialChangeTransaction({
    supabase,
    companyId,
    branchId: branch.id,
    tenantContext,
    userId,
    operationId,
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
    warnings,
  })
  await insertOfficialLifecycleEvent({
    supabase,
    companyId,
    tenantContext,
    userId,
    transaction,
    eventType: 'company_branch_closing_completed',
    eventDate: input.closing_registration_date || input.closing_decision_date,
  })

  return {
    company: precheck.current,
    transaction,
    branch: updated,
    organization_unit: organizationUnit,
    facility,
    warnings,
  }
}

function validationError(message: string, code: string, status = 400, details?: Record<string, any>) {
  return Object.assign(new Error(message), { code, status, details })
}
