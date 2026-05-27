// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: branches
// TARGET_ENDPOINT: /api/v1/companies/{company_id}/official-changes/branch-opening
// NOTES: TS orchestrator is a migration source; move canonical operation flow to Python.

import 'server-only'

import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId } from '@/lib/operations/idempotency'
import { executeWithTransactionBoundary } from '@/lib/operations/transactionBoundary'
import { markBranchOpeningPartialFailure } from '@/lib/operations/transaction-boundary/compensation'
import { BRANCH_PERMISSIONS } from '@/lib/modules/companies/branchPermissions'
import { AuditLogService } from '@/lib/audit/auditLogService'
import { buildAuditContextFromRequest } from '@/lib/audit/auditContext'
import { runIntegrityForOperation } from '@/lib/integrity/integrityChecker'
import { integrityWarningsForMetadata } from '@/lib/integrity/integrityGuards'
import { unwrapDomainResult } from '@/lib/domains/domainServiceResponse'
import { createBranch } from '@/lib/domains/branches/branch.service'
import { createBranchOrganizationUnit } from '@/lib/domains/organization/organization.service'
import { createFacilityForBranch, linkFacilityToBranch } from '@/lib/domains/facilities/facility.service'
import {
  OFFICIAL_CHANGE_EVENT_TYPES,
  OFFICIAL_CHANGE_OPERATION_TYPES,
  OfficialDocumentMetaSchema,
  OfficialDocumentSchema,
  buildBranchOpeningPrecheck,
  emptyToNull,
  ensureOfficialChangeAccess,
  insertOfficialChangeTransaction,
  insertOfficialLifecycleEvent,
  isActiveBranch,
  normalizeDocuments,
  normalizeOptionalString,
  normalizeRequiredString,
  sameText,
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

export const CompanyBranchOpeningSchema = z.object({
  company_id: optionalUuid,
  branch_name: z.string().min(1).max(240),
  branch_short_name: z.string().optional().nullable(),
  branch_type: z.enum(['official_branch', 'liaison_office', 'operation_point', 'warehouse_facility']).default('official_branch'),
  is_official_branch: z.boolean().default(true),
  country: z.string().min(1).default('Turkiye'),
  city: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  address: z.string().min(1),
  postal_code: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.union([z.literal(''), z.string().email()]).optional().nullable(),
  opening_decision_date: z.string().optional().nullable(),
  opening_registration_date: z.string().optional().nullable(),
  trade_registry_gazette_date: z.string().optional().nullable(),
  trade_registry_gazette_number: z.string().optional().nullable(),
  trade_registry_number: z.string().optional().nullable(),
  trade_registry_office: z.string().optional().nullable(),
  tax_office: z.string().optional().nullable(),
  sgk_workplace_registry_no: z.string().optional().nullable(),
  responsible_person_id: optionalUuid,
  create_organization_unit: z.boolean().default(true),
  organization_unit_name: z.string().optional().nullable(),
  parent_organization_unit_id: optionalUuid,
  create_facility: z.boolean().default(false),
  facility_name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  document_files: z.array(OfficialDocumentSchema).default([]),
  document_meta: OfficialDocumentMetaSchema,
})

export type CompanyBranchOpeningInput = z.infer<typeof CompanyBranchOpeningSchema>

type BranchOpeningMutationResult = {
  company: Record<string, any>
  transaction: Record<string, any>
  branch: Record<string, any>
  organization_unit: Record<string, any> | null
  facility: Record<string, any> | null
  warnings: string[]
}

export async function runCompanyBranchOpeningOrchestrator({
  request,
  companyId,
  input,
  rawBody,
}: {
  request: NextRequest
  companyId: string
  input: CompanyBranchOpeningInput
  rawBody: Record<string, any>
}): Promise<OperationOrchestratorResult> {
  if (input.company_id && input.company_id !== companyId) {
    return orchestratorError('Sube acilisi bagli sirketi endpoint sirketiyle uyusmuyor.', 'COMPANY_ID_MISMATCH', 400)
  }

  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, BRANCH_PERMISSIONS.openingStart, 'companies.edit')
  if (access.response) return resultFromNextResponse(access.response)

  const operationCreate = await createOfficialChangeOperation({
    supabase,
    tenantContext: access.tenantContext,
    companyId,
    entityType: 'company',
    entityId: companyId,
    operationType: OFFICIAL_CHANGE_OPERATION_TYPES.branch_opening,
    clientRequestId: resolveClientRequestId(request, rawBody),
    baseVersion: resolveBaseVersion(rawBody),
    baseUpdatedAt: resolveBaseUpdatedAt(rawBody),
    requestedBy: access.userId || null,
    payload: input,
  })
  if ('result' in operationCreate) return operationCreate.result

  const operation = operationCreate.operation
  const operationService = operationCreate.service
  const audit = new AuditLogService(supabase, access.tenantContext)
  const auditContext = buildAuditContextFromRequest(request, access.tenantContext, {
    companyId,
    moduleKey: 'branches',
    entityType: 'company_branch',
    operationId: operation?.id || null,
    userId: access.userId || null,
  })
  await audit.recordOperationStart({
    context: auditContext,
    actionKey: 'branch_opening',
    summary: 'Sube Acilisi islemi baslatildi.',
    newValues: { branch_name: input.branch_name, branch_type: input.branch_type },
  }).catch(() => null)

  try {
    const integrity = await runIntegrityForOperation('branch_opening', {
      supabase,
      tenantContext: access.tenantContext,
      userId: access.userId || null,
      companyId,
      operationKey: 'branch_opening',
      entityType: 'company_branch',
      payload: input,
    })
    if (!integrity.ok) {
      await audit.recordOperationFail({
        context: auditContext,
        actionKey: 'branch_opening',
        summary: 'Sube Acilisi veri tutarliligi nedeniyle baslatilamadi.',
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

    const boundary = await executeWithTransactionBoundary<BranchOpeningMutationResult>({
      supabase,
      key: 'company_branch_opening',
      rpcName: 'perform_company_branch_opening',
      rpcPayload: {
        tenant_id: access.tenantContext.tenantId,
        company_id: companyId,
        user_id: access.userId || null,
        operation_id: operation?.id || null,
        process_instance_id: rawBody.process_instance_id || null,
        branch_payload: input,
        organization_unit_payload: {
          create_organization_unit: input.create_organization_unit,
          organization_unit_name: input.organization_unit_name || input.branch_name,
          parent_organization_unit_id: input.parent_organization_unit_id || null,
        },
        facility_payload: {
          create_facility: input.create_facility,
          facility_name: input.facility_name || input.branch_name,
        },
        transaction_payload: { transaction_type: 'branch_opening' },
        lifecycle_event_payload: { event_type: 'company_branch_opening_completed' },
        outbox_payload: { event_type: OFFICIAL_CHANGE_EVENT_TYPES.branch_opening },
        base_version: resolveBaseVersion(rawBody),
        base_updated_at: resolveBaseUpdatedAt(rawBody),
        payload: input,
      },
      fallback: () => performBranchOpeningApplicationFlow({
        supabase,
        companyId,
        input,
        tenantContext: access.tenantContext,
        userId: access.userId || null,
        operationId: operation?.id || null,
      }),
      compensation: async (partialResult, error) => {
        await markBranchOpeningPartialFailure({
          supabase,
          tenantContext: access.tenantContext,
          branchId: partialResult?.branch?.id || partialResult?.branch_id || null,
          reason: error instanceof Error ? error.message : 'Sube acilisi tamamlanamadi.',
        })
      },
    })

    if (!boundary.ok) {
      await audit.recordOperationFail({
        context: auditContext,
        actionKey: 'branch_opening',
        summary: 'Sube Acilisi islemi tamamlanamadi.',
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
      eventType: OFFICIAL_CHANGE_EVENT_TYPES.branch_opening,
      aggregateType: 'company_branch',
      aggregateId: result.branch.id,
      operation,
      payload: {
        company_id: companyId,
        branch_id: result.branch.id,
        transaction_id: result.transaction.id,
        organization_unit_id: result.organization_unit?.id || null,
        facility_id: result.facility?.id || null,
        transaction_boundary: boundary.used,
        integrity_warnings: integrity.warnings,
      },
    })

    await audit.recordOperationComplete({
      context: {
        ...auditContext,
        entityId: result.branch.id,
        branchId: result.branch.id,
      },
      actionKey: 'branch_opening',
      summary: `${result.branch.branch_name || input.branch_name} acildi.`,
      oldValues: {},
      newValues: result.branch,
      changedFields: Object.keys(result.branch || {}),
      metadata: {
        transaction_id: result.transaction.id,
        organization_unit_id: result.organization_unit?.id || null,
        facility_id: result.facility?.id || null,
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
      actionKey: 'branch_opening',
      summary: 'Sube Acilisi islemi tamamlanamadi.',
      reason: error?.message || 'Sube acilisi tamamlanamadi.',
      metadata: { code: error?.code, details: error?.details },
    }).catch(() => null)
    return failOfficialChangeOperation({
      service: operationService,
      operation,
      message: error?.message || 'Sube acilisi tamamlanamadi.',
      code: error?.code || 'BRANCH_OPENING_FAILED',
      status: 500,
      details: error?.details,
    })
  }
}

async function performBranchOpeningApplicationFlow({
  supabase,
  companyId,
  input,
  tenantContext,
  userId,
  operationId,
}: {
  supabase: ReturnType<typeof createServiceClient>
  companyId: string
  input: CompanyBranchOpeningInput
  tenantContext: any
  userId?: string | null
  operationId?: string | null
}): Promise<BranchOpeningMutationResult> {
  const precheck = await buildBranchOpeningPrecheck(supabase, companyId, tenantContext, {
    branchName: input.branch_name,
    address: input.address,
  })
  if (!precheck.ok) {
    throw Object.assign(new Error(precheck.message), {
      code: 'BRANCH_OPENING_PRECHECK_FAILED',
      details: { reasons: precheck.blocking_reasons, warnings: precheck.warnings },
    })
  }

  const branchName = normalizeRequiredString(input.branch_name)
  const country = normalizeRequiredString(input.country || 'Turkiye')
  const city = normalizeRequiredString(input.city)
  const district = normalizeRequiredString(input.district)
  const address = normalizeRequiredString(input.address)
  const isTurkey = sameText(country, 'Turkiye') || sameText(country, 'Türkiye') || sameText(country, 'Turkey') || sameText(country, 'TR')
  const documents = normalizeDocuments(input.document_files, input.document_meta)

  if (!branchName) throw validationError('Sube adi bos olamaz.', 'BRANCH_NAME_REQUIRED', { fieldErrors: { branch_name: 'Sube adi zorunludur.' } })
  if (!address) throw validationError('Sube adresi bos olamaz.', 'BRANCH_ADDRESS_REQUIRED', { fieldErrors: { address: 'Acik adres zorunludur.' } })
  if (isTurkey && (!city || !district)) throw validationError('Turkiye adreslerinde il ve ilce referans secimi zorunludur.', 'TURKEY_LOCATION_REQUIRED')
  if (input.is_official_branch && (!input.opening_decision_date || !input.opening_registration_date)) throw validationError('Resmi sube acilisi icin karar ve tescil tarihi zorunludur.', 'OFFICIAL_BRANCH_DATES_REQUIRED')
  if (input.is_official_branch && !documents.length) throw validationError('Resmi sube acilisi icin en az bir karar/tescil belgesi eklenmelidir.', 'BRANCH_OPENING_DOCUMENT_REQUIRED')
  if ((precheck.branches || []).some(branch => isActiveBranch(branch) && sameText(branch.branch_name, branchName))) {
    throw validationError('Ayni sirket altinda ayni isimle aktif sube bulunuyor.', 'ACTIVE_BRANCH_NAME_DUPLICATE', { fieldErrors: { branch_name: 'Bu isimle aktif sube var.' } })
  }

  const dateValidation = validateOfficialDates({
    decisionDate: input.opening_decision_date,
    registrationDate: input.opening_registration_date,
    tradeRegistryGazetteDate: input.trade_registry_gazette_date,
  })
  if (!dateValidation.ok) throw validationError(dateValidation.message, dateValidation.code)

  const organizationUnit = input.create_organization_unit
    ? unwrapDomainResult(await createBranchOrganizationUnit({
      supabase,
      tenantContext,
      userId,
      companyId,
      operationId,
    }, {
      companyId,
      branchName: normalizeOptionalString(input.organization_unit_name) || branchName,
      branchShortName: input.branch_short_name || null,
      parentUnitId: input.parent_organization_unit_id || null,
      startDate: input.opening_registration_date || input.opening_decision_date,
      locationName: [district, city].filter(Boolean).join(', ') || null,
      notes: input.notes || null,
    }))
    : null

  const facility = input.create_facility
    ? unwrapDomainResult(await createFacilityForBranch({
      supabase,
      tenantContext,
      userId,
      companyId,
      operationId,
    }, {
      companyId,
      branchName,
      facilityName: input.facility_name || null,
      branchType: input.branch_type,
      country,
      city: city || null,
      district: district || null,
      neighborhood: input.neighborhood || null,
      address,
      postalCode: input.postal_code || null,
      phone: input.phone || null,
      email: input.email || null,
      startDate: input.opening_registration_date || input.opening_decision_date,
      notes: input.notes || null,
    }))
    : null

  if (input.create_facility && !facility) {
    throw Object.assign(new Error('Tesis/lokasyon kaydi olusturulamadi. Tesis/Lokasyon altyapisi hazir olmalidir.'), {
      code: 'FACILITY_CREATE_FAILED',
    })
  }

  const branchPayload = {
    company_id: companyId,
    organization_unit_id: organizationUnit?.id || null,
    facility_id: facility?.id || null,
    branch_name: branchName,
    branch_short_name: normalizeOptionalString(input.branch_short_name),
    branch_type: input.branch_type,
    is_official_branch: input.is_official_branch,
    country,
    city: city || null,
    district: district || null,
    neighborhood: normalizeOptionalString(input.neighborhood),
    address,
    postal_code: normalizeOptionalString(input.postal_code),
    phone: normalizeOptionalString(input.phone),
    email: normalizeOptionalString(input.email),
    trade_registry_number: normalizeOptionalString(input.trade_registry_number),
    trade_registry_office: normalizeOptionalString(input.trade_registry_office),
    tax_office: normalizeOptionalString(input.tax_office),
    sgk_workplace_registry_no: normalizeOptionalString(input.sgk_workplace_registry_no),
    opening_decision_date: emptyToNull(input.opening_decision_date),
    opening_registration_date: emptyToNull(input.opening_registration_date),
    trade_registry_gazette_date: emptyToNull(input.trade_registry_gazette_date),
    trade_registry_gazette_number: normalizeOptionalString(input.trade_registry_gazette_number),
    responsible_person_id: input.responsible_person_id || null,
    status: 'active',
    record_status: 'active',
    start_date: emptyToNull(input.opening_registration_date || input.opening_decision_date),
    notes: normalizeOptionalString(input.notes),
    document_files: documents,
    metadata_json: {
      operation_type: OFFICIAL_CHANGE_OPERATION_TYPES.branch_opening,
      facility_requested: !!input.create_facility,
      facility_name: facility?.facility_name || normalizeOptionalString(input.facility_name),
      facility_not_created: !input.create_facility,
    },
  }
  const branchResult = unwrapDomainResult(await createBranch({ supabase, tenantContext, userId, companyId, operationId }, branchPayload))
  const createdBranch = branchResult.branch
  const linkedFacility = facility
    ? unwrapDomainResult(await linkFacilityToBranch({ supabase, tenantContext, userId, companyId, operationId }, facility.id, createdBranch.id))
    : null

  const changedFields = branchResult.changedFields
  const transaction = await insertOfficialChangeTransaction({
    supabase,
    companyId,
    branchId: createdBranch.id,
    tenantContext,
    userId,
    operationId,
    transactionType: 'branch_opening',
    oldValues: {},
    newValues: createdBranch,
    changedFields,
    documentFiles: documents,
    decisionDate: input.opening_decision_date,
    registrationDate: input.opening_registration_date,
    tradeRegistryGazetteDate: input.trade_registry_gazette_date,
    tradeRegistryGazetteNumber: input.trade_registry_gazette_number,
    effectiveDate: input.opening_registration_date || input.opening_decision_date,
    notes: input.notes || null,
    warnings: dateValidation.warnings,
  })
  await insertOfficialLifecycleEvent({
    supabase,
    companyId,
    tenantContext,
    userId,
    transaction,
    eventType: 'company_branch_opening_completed',
    eventDate: input.opening_registration_date || input.opening_decision_date,
  })

  return {
    company: precheck.current,
    transaction,
    branch: createdBranch,
    organization_unit: organizationUnit,
    facility: linkedFacility || facility,
    warnings: dateValidation.warnings,
  }
}

function validationError(message: string, code: string, details?: Record<string, any>) {
  return Object.assign(new Error(message), { code, status: 400, details })
}
