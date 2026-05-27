// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: company
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/official-changes/title-change
// NOTES: Proxies to FastAPI when configured; legacy TS fallback is temporary migration bridge.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { isFastApiEnabled, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { syncMasterContact } from '@/lib/identity/masterContact'
import {
  OFFICIAL_CHANGE_EVENT_TYPES,
  OFFICIAL_CHANGE_OPERATION_TYPES,
  OfficialDocumentMetaSchema,
  OfficialDocumentSchema,
  buildOfficialChangePrecheck,
  duplicateOfficialChangeResponse,
  emptyToNull,
  ensureOfficialChangeAccess,
  hydrateOfficialCompanyResponse,
  insertOfficialChangeTransaction,
  insertOfficialLifecycleEvent,
  normalizeDocuments,
  normalizeOptionalString,
  normalizeRequiredString,
  officialChangeError,
  officialChangeSuccess,
  pickValues,
  sameText,
  updateOfficialCompanyFields,
  updatePublicOfficialRow,
  validateOfficialDates,
} from '../_shared'

const TitleChangeSchema = z.object({
  new_trade_name: z.string().min(1).max(300),
  new_short_name: z.string().optional().nullable(),
  mersis_changed: z.boolean().default(false),
  new_mersis_number: z.string().optional().nullable(),
  new_trade_registry_number: z.string().optional().nullable(),
  decision_date: z.string().optional().nullable(),
  registration_date: z.string().optional().nullable(),
  trade_registry_gazette_date: z.string().optional().nullable(),
  trade_registry_gazette_number: z.string().optional().nullable(),
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
    const proxied = await proxyToFastApi(request, `/api/v1/companies/${companyId}/official-changes/title-change`)
    if (proxied) return proxied
  }
  console.warn('FastAPI backend not configured; using legacy TS fallback for title change.')

  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, 'companies.edit')
  if (access.response) return access.response

  const rawBody = await request.json().catch(() => ({}))
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const parsed = TitleChangeSchema.safeParse(stripOperationControlFields(rawBody))
  if (!parsed.success) {
    return officialChangeError('Unvan değişikliği verileri geçerli değil.', 'VALIDATION_FAILED', 400, { validation: parsed.error.flatten() })
  }

  const input = parsed.data
  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: access.tenantContext.tenantId,
    companyId,
    moduleKey: 'sirket',
    entityType: 'company',
    entityId: companyId,
    operationType: OFFICIAL_CHANGE_OPERATION_TYPES.title_change,
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
    const precheck = await buildOfficialChangePrecheck(supabase, companyId, access.tenantContext, 'title_change')
    if (!precheck.ok) {
      return fail(precheck.message, 'TITLE_CHANGE_PRECHECK_FAILED', 409, {
        reasons: precheck.blocking_reasons,
        warnings: precheck.warnings,
      })
    }

    const newTradeName = normalizeRequiredString(input.new_trade_name)
    if (!newTradeName) return fail('Yeni ticari unvan boş olamaz.', 'NEW_TRADE_NAME_REQUIRED', 400, { fieldErrors: { new_trade_name: 'Yeni ticari unvan zorunludur.' } })
    if (sameText(newTradeName, precheck.current.trade_name)) {
      return fail('Yeni ticari unvan mevcut ticari unvanla aynı olamaz.', 'NEW_TRADE_NAME_SAME_AS_CURRENT', 400, { fieldErrors: { new_trade_name: 'Yeni unvan mevcut unvandan farklı olmalıdır.' } })
    }

    const dateValidation = validateOfficialDates({
      decisionDate: input.decision_date,
      registrationDate: input.registration_date,
      tradeRegistryGazetteDate: input.trade_registry_gazette_date,
    })
    if (!dateValidation.ok) {
      return fail(dateValidation.message, dateValidation.code, 400, { fieldErrors: { registration_date: dateValidation.message } })
    }
    if (input.mersis_changed && !normalizeOptionalString(input.new_mersis_number)) {
      return fail('MERSİS değişti olarak işaretlendiyse yeni MERSİS numarası girilmelidir.', 'NEW_MERSIS_REQUIRED', 400, { fieldErrors: { new_mersis_number: 'Yeni MERSİS numarası girilmelidir.' } })
    }

    const companyPatch: Record<string, any> = {
      trade_name: newTradeName,
      short_name: normalizeOptionalString(input.new_short_name),
      ...(input.mersis_changed ? { mersis_number: normalizeOptionalString(input.new_mersis_number) } : {}),
      ...(normalizeOptionalString(input.new_trade_registry_number) ? { trade_registry_number: normalizeOptionalString(input.new_trade_registry_number) } : {}),
    }

    const companyUpdate = await updateOfficialCompanyFields({
      supabase,
      companyId,
      tenantContext: access.tenantContext,
      userId: access.userId,
      patch: companyPatch,
      baseVersion,
      baseUpdatedAt,
    })
    if (!companyUpdate.ok) {
      return fail(companyUpdate.error, companyUpdate.code, companyUpdate.status, companyUpdate.details as Record<string, unknown> | undefined)
    }
    if (!companyUpdate.changedFields.length) {
      return fail('Unvan değişikliği için değişen alan bulunamadı.', 'NO_CHANGED_FIELDS', 400)
    }

    await syncMasterContact(supabase, 'organization', companyUpdate.previousCompany.organization_id, {
      trade_name: companyUpdate.company.trade_name,
      short_name: companyUpdate.company.short_name,
    }).catch(() => null)

    const registryPatch: Record<string, any> = {}
    if (companyUpdate.changedFields.includes('mersis_number')) registryPatch.mersis_number = companyUpdate.company.mersis_number
    if (companyUpdate.changedFields.includes('trade_registry_number')) registryPatch.trade_registry_no = companyUpdate.company.trade_registry_number
    if (Object.keys(registryPatch).length) {
      registryPatch.last_change_date = emptyToNull(input.registration_date) || new Date().toISOString().slice(0, 10)
      await updatePublicOfficialRow({
        supabase,
        tableName: 'company_public_registry',
        companyId,
        tenantContext: access.tenantContext,
        userId: access.userId,
        patch: registryPatch,
        action: 'Unvan değişikliği sicil bilgisi güncellendi',
      })
    }

    const documents = normalizeDocuments(input.document_files, input.document_meta)
    const oldValues = pickValues(companyUpdate.previousCompany, companyUpdate.changedFields)
    const newValues = pickValues(companyUpdate.company, companyUpdate.changedFields)
    const warnings = dateValidation.warnings
    const transaction = await insertOfficialChangeTransaction({
      supabase,
      companyId,
      tenantContext: access.tenantContext,
      userId: access.userId,
      operationId: operation?.id || null,
      transactionType: 'title_change',
      oldValues,
      newValues,
      changedFields: companyUpdate.changedFields,
      documentFiles: documents,
      decisionDate: input.decision_date,
      registrationDate: input.registration_date,
      tradeRegistryGazetteDate: input.trade_registry_gazette_date,
      tradeRegistryGazetteNumber: input.trade_registry_gazette_number,
      effectiveDate: input.registration_date || input.decision_date,
      notes: input.notes || null,
      warnings,
    })

    await insertOfficialLifecycleEvent({
      supabase,
      companyId,
      tenantContext: access.tenantContext,
      userId: access.userId,
      transaction,
      eventType: 'company_title_change_completed',
      eventDate: input.registration_date || input.decision_date,
    })

    const nextContext = await buildOfficialChangePrecheck(supabase, companyId, access.tenantContext, 'title_change')
    const company = hydrateOfficialCompanyResponse(companyUpdate.company, nextContext)
    const result = { company, transaction }

    if (operation) {
      await operationService.markCompleted(operation.id, result, warnings)
      await new OutboxEventService(supabase as any).enqueue({
        tenantId: access.tenantContext.tenantId,
        companyId,
        moduleKey: 'sirket',
        eventType: OFFICIAL_CHANGE_EVENT_TYPES.title_change,
        aggregateType: 'company_official_change_transaction',
        aggregateId: transaction.id,
        operationId: operation.id,
        payload: {
          company_id: companyId,
          transaction_id: transaction.id,
          changed_fields: companyUpdate.changedFields,
        },
      }).catch(() => null)
    }

    return officialChangeSuccess(result, operation ? { id: operation.id, operation_status: 'completed' } : null)
  } catch (error: any) {
    const message = error?.message || 'Unvan değişikliği tamamlanamadı.'
    if (operation) await operationService.markFailed(operation.id, { code: error?.code || 'TITLE_CHANGE_FAILED', message })
    return officialChangeError(message, error?.code || 'TITLE_CHANGE_FAILED', 500, undefined, operation ? { id: operation.id, operation_status: 'failed' } : null)
  }
}
