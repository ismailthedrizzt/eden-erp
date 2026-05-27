// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: company
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/official-changes/activity-subject-change
// NOTES: Proxies to FastAPI when configured; legacy TS fallback is temporary migration bridge.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { isFastApiEnabled, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import {
  OFFICIAL_CHANGE_EVENT_TYPES,
  OFFICIAL_CHANGE_OPERATION_TYPES,
  OfficialDocumentMetaSchema,
  OfficialDocumentSchema,
  buildActivitySubjectChangePrecheck,
  duplicateOfficialChangeResponse,
  ensureOfficialChangeAccess,
  hydrateOfficialCompanyResponse,
  insertOfficialChangeTransaction,
  insertOfficialLifecycleEvent,
  normalizeDocuments,
  normalizeRequiredString,
  officialChangeError,
  officialChangeSuccess,
  resolveOfficialNaceRows,
  sameText,
  summarizeOfficialNaceRows,
  syncOfficialNaceCodes,
  updateOfficialCompanyFields,
  validateOfficialDates,
  type OfficialNaceInputRow,
} from '../_shared'

const NaceRowSchema = z.object({
  id: z.string().optional().nullable(),
  nace_code_id: z.string().optional().nullable(),
  nace_code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  hazard_class: z.string().optional().nullable(),
  is_primary: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const ActivitySubjectChangeSchema = z.object({
  new_activity_subject: z.string().min(1),
  change_reason: z.string().optional().nullable(),
  nace_codes: z.array(NaceRowSchema).default([]),
  primary_nace_code_id: z.string().optional().nullable(),
  secondary_nace_code_ids: z.array(z.string()).optional().default([]),
  decision_date: z.string().min(1),
  registration_date: z.string().min(1),
  trade_registry_gazette_date: z.string().optional().nullable(),
  trade_registry_gazette_number: z.string().optional().nullable(),
  mersis_impact: z.string().optional().nullable(),
  tax_office_impact: z.string().optional().nullable(),
  sgk_hazard_class_impact: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  document_files: z.array(OfficialDocumentSchema).default([]),
  document_meta: OfficialDocumentMetaSchema,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  if (isFastApiEnabled()) {
    const proxied = await proxyToFastApi(request, `/api/v1/companies/${companyId}/official-changes/activity-subject-change`)
    if (proxied) return proxied
  }
  console.warn('FastAPI backend not configured; using legacy TS fallback for activity subject change.')

  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, 'companies.edit')
  if (access.response) return access.response

  const rawBody = await request.json().catch(() => ({}))
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const parsed = ActivitySubjectChangeSchema.safeParse(stripOperationControlFields(rawBody))
  if (!parsed.success) {
    return officialChangeError('Faaliyet konusu değişikliği verileri geçerli değil.', 'VALIDATION_FAILED', 400, { validation: parsed.error.flatten() })
  }

  const input = parsed.data
  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: access.tenantContext.tenantId,
    companyId,
    moduleKey: 'sirket',
    entityType: 'company',
    entityId: companyId,
    operationType: OFFICIAL_CHANGE_OPERATION_TYPES.activity_subject_change,
    clientRequestId,
    baseVersion,
    baseUpdatedAt,
    requestedBy: access.userId || null,
    payload: input,
  })
  if (operationCreate.ok && operationCreate.duplicate) return duplicateOfficialChangeResponse(operationCreate.operation)
  if (!operationCreate.ok && !operationCreate.missingInfrastructure) {
    return officialChangeError(operationCreate.error, operationCreate.code || 'OPERATION_REQUEST_FAILED', 500)
  }

  const operation = operationCreate.ok ? operationCreate.operation : null
  if (operation) await operationService.markProcessing(operation.id)

  const fail = async (message: string, code: string, status = 400, details?: Record<string, unknown>) => {
    if (operation) await operationService.markFailed(operation.id, { code, message, details: details || {} })
    return officialChangeError(message, code, status, details, operation ? { id: operation.id, operation_status: 'failed' } : null)
  }

  try {
    const precheck = await buildActivitySubjectChangePrecheck(supabase, companyId, access.tenantContext)
    if (!precheck.ok) {
      return fail(precheck.message, 'ACTIVITY_SUBJECT_CHANGE_PRECHECK_FAILED', 409, {
        reasons: precheck.blocking_reasons,
        warnings: precheck.warnings,
      })
    }

    const newActivitySubject = normalizeRequiredString(input.new_activity_subject)
    const currentActivitySubject = normalizeRequiredString(precheck.activity_subject || precheck.current?.activity_subject)
    if (!newActivitySubject) {
      return fail('Yeni faaliyet konusu boş olamaz.', 'ACTIVITY_SUBJECT_REQUIRED', 400, { fieldErrors: { new_activity_subject: 'Yeni faaliyet konusu zorunludur.' } })
    }
    if (currentActivitySubject && sameText(newActivitySubject, currentActivitySubject)) {
      return fail('Yeni faaliyet konusu mevcut faaliyet konusu ile aynı olamaz.', 'ACTIVITY_SUBJECT_SAME_AS_CURRENT', 400, { fieldErrors: { new_activity_subject: 'Yeni faaliyet konusu farklı olmalıdır.' } })
    }

    const dateValidation = validateOfficialDates({
      decisionDate: input.decision_date,
      registrationDate: input.registration_date,
      tradeRegistryGazetteDate: input.trade_registry_gazette_date,
    })
    if (!dateValidation.ok) {
      return fail(dateValidation.message, dateValidation.code, 400, { fieldErrors: { registration_date: dateValidation.message } })
    }

    const resolved = await resolveOfficialNaceRows(supabase, extractNaceRows(input))
    if (!resolved.ok) {
      return fail(resolved.message, resolved.code, 400, { fieldErrors: { nace_codes: resolved.message } })
    }

    const primary = resolved.rows.find(row => row.is_primary)
    const nextNaceCodes = resolved.rows.map(row => row.nace_code.nace_code).filter(Boolean)
    const previousSummary = summarizeOfficialNaceRows(precheck.nace_codes || [])
    const companyUpdate = await updateOfficialCompanyFields({
      supabase,
      companyId,
      tenantContext: access.tenantContext,
      userId: access.userId,
      patch: {
        activity_subject: newActivitySubject,
        nace_codes: nextNaceCodes,
        risk_class: primary?.nace_code?.hazard_class || null,
      },
      baseVersion,
      baseUpdatedAt,
    })
    if (!companyUpdate.ok) {
      return fail(companyUpdate.error, companyUpdate.code, companyUpdate.status, companyUpdate.details as Record<string, unknown> | undefined)
    }

    const syncResult = await syncOfficialNaceCodes({
      supabase,
      companyId,
      tenantContext: access.tenantContext,
      userId: access.userId,
      rows: resolved.rows,
      effectiveDate: input.registration_date,
    })
    const warnings = [
      ...dateValidation.warnings,
      ...syncResult.warnings,
      ...(primary?.nace_code?.hazard_class ? [] : ['Birincil NACE için SGK tehlike sınıfı referans listesinde bulunamadı.']),
    ]
    const documents = normalizeDocuments(input.document_files, input.document_meta)
    const changedFields = Array.from(new Set([...companyUpdate.changedFields, 'company_nace_codes', 'public_sgk.risk_class']))
    const transaction = await insertOfficialChangeTransaction({
      supabase,
      companyId,
      tenantContext: access.tenantContext,
      userId: access.userId,
      operationId: operation?.id || null,
      transactionType: 'activity_subject_change',
      oldValues: {
        activity_subject: currentActivitySubject || null,
        nace_codes: previousSummary,
        risk_class: precheck.current?.risk_class || precheck.public_sgk?.risk_class || null,
      },
      newValues: {
        activity_subject: newActivitySubject,
        nace_codes: summarizeOfficialNaceRows(syncResult.rows),
        risk_class: primary?.nace_code?.hazard_class || null,
        change_reason: input.change_reason || null,
        mersis_impact: input.mersis_impact || null,
        tax_office_impact: input.tax_office_impact || null,
        sgk_hazard_class_impact: input.sgk_hazard_class_impact || null,
      },
      changedFields,
      documentFiles: documents,
      decisionDate: input.decision_date,
      registrationDate: input.registration_date,
      tradeRegistryGazetteDate: input.trade_registry_gazette_date,
      tradeRegistryGazetteNumber: input.trade_registry_gazette_number,
      effectiveDate: input.registration_date || input.decision_date,
      notes: input.notes || input.change_reason || null,
      warnings,
    })

    await insertOfficialLifecycleEvent({
      supabase,
      companyId,
      tenantContext: access.tenantContext,
      userId: access.userId,
      transaction,
      eventType: 'company_activity_subject_change_completed',
      eventDate: input.registration_date || input.decision_date,
    })

    const nextContext = await buildActivitySubjectChangePrecheck(supabase, companyId, access.tenantContext)
    const company = hydrateOfficialCompanyResponse(companyUpdate.company, nextContext) as Record<string, any>
    company.company_nace_codes = syncResult.rows
    const result = { company, transaction, nace_codes: syncResult.rows, warnings }

    if (operation) {
      await operationService.markCompleted(operation.id, result, warnings)
      await new OutboxEventService(supabase as any).enqueue({
        tenantId: access.tenantContext.tenantId,
        companyId,
        moduleKey: 'sirket',
        eventType: OFFICIAL_CHANGE_EVENT_TYPES.activity_subject_change,
        aggregateType: 'company_official_change_transaction',
        aggregateId: transaction.id,
        operationId: operation.id,
        payload: {
          company_id: companyId,
          transaction_id: transaction.id,
          changed_fields: changedFields,
          primary_nace_code: primary?.nace_code?.nace_code || null,
        },
      }).catch(() => null)
    }

    return officialChangeSuccess(result, operation ? { id: operation.id, operation_status: 'completed' } : null)
  } catch (error: any) {
    const message = error?.message || 'Faaliyet konusu değişikliği tamamlanamadı.'
    if (operation) await operationService.markFailed(operation.id, { code: error?.code || 'ACTIVITY_SUBJECT_CHANGE_FAILED', message })
    return officialChangeError(message, error?.code || 'ACTIVITY_SUBJECT_CHANGE_FAILED', 500, undefined, operation ? { id: operation.id, operation_status: 'failed' } : null)
  }
}

function extractNaceRows(input: z.infer<typeof ActivitySubjectChangeSchema>): OfficialNaceInputRow[] {
  if (input.nace_codes.length) {
    return input.nace_codes.map(row => ({
      nace_code_id: row.nace_code_id || row.id || null,
      nace_code: row.nace_code || null,
      description: row.description || null,
      hazard_class: row.hazard_class || null,
      is_primary: !!row.is_primary,
      notes: row.notes || null,
    }))
  }

  const rows: OfficialNaceInputRow[] = []
  if (input.primary_nace_code_id) rows.push({ nace_code_id: input.primary_nace_code_id, is_primary: true })
  for (const id of input.secondary_nace_code_ids || []) {
    if (id && id !== input.primary_nace_code_id) rows.push({ nace_code_id: id, is_primary: false })
  }
  return rows
}
