import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
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
  updateOfficialCompanyFields,
  updatePublicOfficialRow,
} from '../_shared'

const PublicRegistrationUpdateSchema = z.object({
  tax_office: z.string().optional().nullable(),
  trade_registry_office: z.string().optional().nullable(),
  trade_registry_number: z.string().optional().nullable(),
  mersis_number: z.string().optional().nullable(),
  electronic_notification_address: z.string().optional().nullable(),
  e_invoice_taxpayer: z.boolean().optional(),
  e_archive_taxpayer: z.boolean().optional(),
  e_waybill_taxpayer: z.boolean().optional(),
  sgk_workplace_registry_no: z.string().optional().nullable(),
  sgk_province: z.string().optional().nullable(),
  sgk_branch: z.string().optional().nullable(),
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
  const strippedBody = stripOperationControlFields(rawBody)
  const parsed = PublicRegistrationUpdateSchema.safeParse(strippedBody)
  if (!parsed.success) {
    return officialChangeError('Kamu / tescil güncelleme verileri geçerli değil.', 'VALIDATION_FAILED', 400, { validation: parsed.error.flatten() })
  }

  const input = parsed.data
  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: access.tenantContext.tenantId,
    companyId,
    moduleKey: 'sirket',
    entityType: 'company',
    entityId: companyId,
    operationType: OFFICIAL_CHANGE_OPERATION_TYPES.public_registration_update,
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
    const precheck = await buildOfficialChangePrecheck(supabase, companyId, access.tenantContext, 'public_registration_update')
    if (!precheck.ok) {
      return fail(precheck.message, 'PUBLIC_REGISTRATION_PRECHECK_FAILED', 409, {
        reasons: precheck.blocking_reasons,
        warnings: precheck.warnings,
      })
    }

    if (Object.prototype.hasOwnProperty.call(strippedBody, 'tax_number')) {
      return fail('VKN bu wizard üzerinden değiştirilemez.', 'TAX_NUMBER_CHANGE_NOT_ALLOWED', 400)
    }
    if (Object.prototype.hasOwnProperty.call(input, 'tax_office') && !normalizeRequiredString(input.tax_office)) {
      return fail('Vergi dairesi boş olamaz.', 'TAX_OFFICE_REQUIRED', 400, { fieldErrors: { tax_office: 'Vergi dairesi seçilmelidir.' } })
    }

    const companyPatch = buildCompanyPatch(input, strippedBody)
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
      return fail('Kamu / tescil güncellemesi için en az bir alan değişmelidir.', 'NO_CHANGED_FIELDS', 400)
    }

    await syncRelatedPublicTables({
      supabase,
      companyId,
      userId: access.userId,
      tenantContext: access.tenantContext,
      company: companyUpdate.company,
      changedFields: companyUpdate.changedFields,
    })

    const documents = normalizeDocuments(input.document_files, input.document_meta)
    const oldValues = pickValues(companyUpdate.previousCompany, companyUpdate.changedFields)
    const newValues = pickValues(companyUpdate.company, companyUpdate.changedFields)
    const transaction = await insertOfficialChangeTransaction({
      supabase,
      companyId,
      tenantContext: access.tenantContext,
      userId: access.userId,
      operationId: operation?.id || null,
      transactionType: 'public_registration_update',
      oldValues,
      newValues,
      changedFields: companyUpdate.changedFields,
      documentFiles: documents,
      effectiveDate: new Date().toISOString().slice(0, 10),
      notes: input.notes || null,
      warnings: [],
    })

    await insertOfficialLifecycleEvent({
      supabase,
      companyId,
      tenantContext: access.tenantContext,
      userId: access.userId,
      transaction,
      eventType: 'company_public_registration_update_completed',
      eventDate: new Date().toISOString().slice(0, 10),
    })

    const nextContext = await buildOfficialChangePrecheck(supabase, companyId, access.tenantContext, 'public_registration_update')
    const company = hydrateOfficialCompanyResponse(companyUpdate.company, nextContext)
    const result = { company, transaction }

    if (operation) {
      await operationService.markCompleted(operation.id, result)
      await new OutboxEventService(supabase as any).enqueue({
        tenantId: access.tenantContext.tenantId,
        companyId,
        moduleKey: 'sirket',
        eventType: OFFICIAL_CHANGE_EVENT_TYPES.public_registration_update,
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
    const message = error?.message || 'Kamu / tescil bilgisi güncellemesi tamamlanamadı.'
    if (operation) await operationService.markFailed(operation.id, { code: error?.code || 'PUBLIC_REGISTRATION_UPDATE_FAILED', message })
    return officialChangeError(message, error?.code || 'PUBLIC_REGISTRATION_UPDATE_FAILED', 500, undefined, operation ? { id: operation.id, operation_status: 'failed' } : null)
  }
}

function buildCompanyPatch(input: z.infer<typeof PublicRegistrationUpdateSchema>, rawBody: Record<string, unknown>) {
  const patch: Record<string, any> = {}
  const textFields = [
    'tax_office',
    'trade_registry_office',
    'trade_registry_number',
    'mersis_number',
    'electronic_notification_address',
    'sgk_workplace_registry_no',
    'sgk_province',
    'sgk_branch',
  ] as const
  const booleanFields = ['e_invoice_taxpayer', 'e_archive_taxpayer', 'e_waybill_taxpayer'] as const

  textFields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(rawBody, field)) patch[field] = normalizeOptionalString(input[field])
  })
  booleanFields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(rawBody, field)) patch[field] = Boolean(input[field])
  })

  return patch
}

async function syncRelatedPublicTables({
  supabase,
  companyId,
  tenantContext,
  userId,
  company,
  changedFields,
}: {
  supabase: ReturnType<typeof createServiceClient>
  companyId: string
  tenantContext: any
  userId?: string | null
  company: Record<string, any>
  changedFields: string[]
}) {
  const has = (field: string) => changedFields.includes(field)

  const taxPatch: Record<string, any> = {}
  if (has('tax_office')) taxPatch.tax_office = company.tax_office
  if (has('e_invoice_taxpayer')) taxPatch.e_invoice_taxpayer = company.e_invoice_taxpayer
  if (has('e_archive_taxpayer')) taxPatch.e_archive_taxpayer = company.e_archive_taxpayer
  if (has('e_waybill_taxpayer')) taxPatch.e_waybill_enabled = company.e_waybill_taxpayer
  if (Object.keys(taxPatch).length) {
    await updatePublicOfficialRow({
      supabase,
      tableName: 'company_public_tax',
      companyId,
      tenantContext,
      userId,
      patch: taxPatch,
      action: 'Kamu / tescil güncellemesi vergi bilgisi güncellendi',
    })
  }

  const registryPatch: Record<string, any> = {}
  if (has('mersis_number')) registryPatch.mersis_number = company.mersis_number
  if (has('trade_registry_number')) registryPatch.trade_registry_no = company.trade_registry_number
  if (has('trade_registry_office')) registryPatch.registry_office = company.trade_registry_office
  if (Object.keys(registryPatch).length) {
    registryPatch.last_change_date = emptyToNull(new Date().toISOString().slice(0, 10))
    await updatePublicOfficialRow({
      supabase,
      tableName: 'company_public_registry',
      companyId,
      tenantContext,
      userId,
      patch: registryPatch,
      action: 'Kamu / tescil güncellemesi sicil bilgisi güncellendi',
    })
  }

  const sgkPatch: Record<string, any> = {}
  if (has('sgk_workplace_registry_no')) sgkPatch.workplace_registry_no = company.sgk_workplace_registry_no
  if (has('sgk_province')) sgkPatch.province = company.sgk_province
  if (has('sgk_branch')) sgkPatch.branch = company.sgk_branch
  if (Object.keys(sgkPatch).length) {
    await updatePublicOfficialRow({
      supabase,
      tableName: 'company_public_sgk',
      companyId,
      tenantContext,
      userId,
      patch: sgkPatch,
      action: 'Kamu / tescil güncellemesi SGK bilgisi güncellendi',
    })
  }

  if (has('electronic_notification_address')) {
    await updatePublicOfficialRow({
      supabase,
      tableName: 'company_public_channels',
      companyId,
      tenantContext,
      userId,
      patch: {
        e_notification_address: company.electronic_notification_address,
        e_notification_active: Boolean(company.electronic_notification_address),
      },
      action: 'Kamu / tescil güncellemesi elektronik tebligat bilgisi güncellendi',
    })
  }
}
