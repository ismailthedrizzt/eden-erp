import { NextRequest } from 'next/server'
import { z } from 'zod'
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
  validateOfficialDates,
} from '../_shared'

const AddressChangeSchema = z.object({
  new_country: z.string().min(1).default('Türkiye'),
  new_city: z.string().optional().nullable(),
  new_district: z.string().optional().nullable(),
  new_neighborhood: z.string().optional().nullable(),
  new_address: z.string().min(1),
  postal_code: z.string().optional().nullable(),
  address_change_type: z.enum(['headquarters', 'branch_facility', 'correspondence']).default('headquarters'),
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
  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, 'companies.edit')
  if (access.response) return access.response

  const rawBody = await request.json().catch(() => ({}))
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const parsed = AddressChangeSchema.safeParse(stripOperationControlFields(rawBody))
  if (!parsed.success) {
    return officialChangeError('Adres değişikliği verileri geçerli değil.', 'VALIDATION_FAILED', 400, { validation: parsed.error.flatten() })
  }

  const input = parsed.data
  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: access.tenantContext.tenantId,
    companyId,
    moduleKey: 'sirket',
    entityType: 'company',
    entityId: companyId,
    operationType: OFFICIAL_CHANGE_OPERATION_TYPES.address_change,
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
    const precheck = await buildOfficialChangePrecheck(supabase, companyId, access.tenantContext, 'address_change')
    if (!precheck.ok) {
      return fail(precheck.message, 'ADDRESS_CHANGE_PRECHECK_FAILED', 409, {
        reasons: precheck.blocking_reasons,
        warnings: precheck.warnings,
      })
    }

    const country = normalizeRequiredString(input.new_country || 'Türkiye')
    const city = normalizeRequiredString(input.new_city)
    const district = normalizeRequiredString(input.new_district)
    const address = normalizeRequiredString(input.new_address)
    const isTurkey = sameText(country, 'Türkiye') || sameText(country, 'Turkey') || sameText(country, 'TR')

    if (!address) return fail('Yeni açık adres boş olamaz.', 'NEW_ADDRESS_REQUIRED', 400, { fieldErrors: { new_address: 'Yeni açık adres zorunludur.' } })
    if (!city) return fail('Yeni il boş olamaz.', 'NEW_CITY_REQUIRED', 400, { fieldErrors: { new_city: 'Yeni il seçilmelidir.' } })
    if (!district) return fail('Yeni ilçe boş olamaz.', 'NEW_DISTRICT_REQUIRED', 400, { fieldErrors: { new_district: 'Yeni ilçe seçilmelidir.' } })
    if (isTurkey && (!city || !district)) {
      return fail('Türkiye adreslerinde il ve ilçe referans seçimi zorunludur.', 'TURKEY_LOCATION_REQUIRED', 400)
    }

    const current = precheck.current
    const addressSame =
      sameText(country, current.country)
      && sameText(city, current.city)
      && sameText(district, current.district)
      && sameText(address, current.address)
      && sameText(input.postal_code, current.postal_code)
    if (addressSame) {
      return fail('Yeni adres mevcut adresle aynı olamaz.', 'NEW_ADDRESS_SAME_AS_CURRENT', 400, { fieldErrors: { new_address: 'Yeni adres mevcut adresten farklı olmalıdır.' } })
    }

    const dateValidation = validateOfficialDates({
      decisionDate: input.decision_date,
      registrationDate: input.registration_date,
      tradeRegistryGazetteDate: input.trade_registry_gazette_date,
    })
    if (!dateValidation.ok) {
      return fail(dateValidation.message, dateValidation.code, 400, { fieldErrors: { registration_date: dateValidation.message } })
    }

    const companyPatch: Record<string, any> = {
      country,
      city,
      district,
      address,
      postal_code: normalizeOptionalString(input.postal_code),
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
      return fail('Adres değişikliği için değişen alan bulunamadı.', 'NO_CHANGED_FIELDS', 400)
    }

    await syncMasterContact(supabase, 'organization', companyUpdate.previousCompany.organization_id, {
      country: companyUpdate.company.country,
      city: companyUpdate.company.city,
      district: companyUpdate.company.district,
      address: companyUpdate.company.address,
    }).catch(() => null)

    const documents = normalizeDocuments(input.document_files, input.document_meta)
    const oldValues = pickValues(companyUpdate.previousCompany, companyUpdate.changedFields)
    const newValues = {
      ...pickValues(companyUpdate.company, companyUpdate.changedFields),
      ...(normalizeOptionalString(input.new_neighborhood) ? { neighborhood: normalizeOptionalString(input.new_neighborhood) } : {}),
      address_change_type: input.address_change_type,
    }
    const warnings = dateValidation.warnings
    const transaction = await insertOfficialChangeTransaction({
      supabase,
      companyId,
      tenantContext: access.tenantContext,
      userId: access.userId,
      operationId: operation?.id || null,
      transactionType: 'address_change',
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
      eventType: 'company_address_change_completed',
      eventDate: input.registration_date || input.decision_date,
    })

    const nextContext = await buildOfficialChangePrecheck(supabase, companyId, access.tenantContext, 'address_change')
    const company = hydrateOfficialCompanyResponse(companyUpdate.company, nextContext)
    const result = { company, transaction }

    if (operation) {
      await operationService.markCompleted(operation.id, result, warnings)
      await new OutboxEventService(supabase as any).enqueue({
        tenantId: access.tenantContext.tenantId,
        companyId,
        moduleKey: 'sirket',
        eventType: OFFICIAL_CHANGE_EVENT_TYPES.address_change,
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
    const message = error?.message || 'Adres değişikliği tamamlanamadı.'
    if (operation) await operationService.markFailed(operation.id, { code: error?.code || 'ADDRESS_CHANGE_FAILED', message })
    return officialChangeError(message, error?.code || 'ADDRESS_CHANGE_FAILED', 500, undefined, operation ? { id: operation.id, operation_status: 'failed' } : null)
  }
}
