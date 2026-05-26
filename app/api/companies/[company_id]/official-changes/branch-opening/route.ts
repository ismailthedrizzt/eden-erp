import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { resolveBaseUpdatedAt, resolveBaseVersion, resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { BRANCH_PERMISSIONS } from '@/lib/modules/companies/branchPermissions'
import {
  OFFICIAL_BRANCH_SELECT,
  OFFICIAL_CHANGE_EVENT_TYPES,
  OFFICIAL_CHANGE_OPERATION_TYPES,
  OfficialDocumentMetaSchema,
  OfficialDocumentSchema,
  buildBranchOpeningPrecheck,
  attachFacilityToBranch,
  createBranchFacility,
  createBranchOrganizationUnit,
  duplicateOfficialChangeResponse,
  emptyToNull,
  ensureOfficialChangeAccess,
  insertOfficialChangeTransaction,
  insertOfficialLifecycleEvent,
  isActiveBranch,
  normalizeDocuments,
  normalizeOptionalString,
  normalizeRequiredString,
  officialChangeError,
  officialChangeSuccess,
  sameText,
  validateOfficialDates,
} from '../_shared'

const emptyStringToUndefined = (value: unknown) => value === '' ? undefined : value
const optionalUuid = z.preprocess(emptyStringToUndefined, z.string().uuid().optional().nullable())

const BranchOpeningSchema = z.object({
  company_id: optionalUuid,
  branch_name: z.string().min(1).max(240),
  branch_short_name: z.string().optional().nullable(),
  branch_type: z.enum(['official_branch', 'liaison_office', 'operation_point', 'warehouse_facility']).default('official_branch'),
  is_official_branch: z.boolean().default(true),
  country: z.string().min(1).default('Türkiye'),
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  const supabase = createServiceClient()
  const access = await ensureOfficialChangeAccess(request, supabase, companyId, BRANCH_PERMISSIONS.openingStart, 'companies.edit')
  if (access.response) return access.response

  const rawBody = await request.json().catch(() => ({}))
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const parsed = BranchOpeningSchema.safeParse(stripOperationControlFields(rawBody))
  if (!parsed.success) return officialChangeError('Şube açılışı verileri geçerli değil.', 'VALIDATION_FAILED', 400, { validation: parsed.error.flatten() })
  const input = parsed.data
  if (input.company_id && input.company_id !== companyId) return officialChangeError('Şube açılışı bağlı şirketi endpoint şirketiyle uyuşmuyor.', 'COMPANY_ID_MISMATCH', 400)

  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: access.tenantContext.tenantId,
    companyId,
    moduleKey: 'sirket',
    entityType: 'company',
    entityId: companyId,
    operationType: OFFICIAL_CHANGE_OPERATION_TYPES.branch_opening,
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
    const precheck = await buildBranchOpeningPrecheck(supabase, companyId, access.tenantContext, { branchName: input.branch_name, address: input.address })
    if (!precheck.ok) return fail(precheck.message, 'BRANCH_OPENING_PRECHECK_FAILED', 409, { reasons: precheck.blocking_reasons, warnings: precheck.warnings })

    const branchName = normalizeRequiredString(input.branch_name)
    const country = normalizeRequiredString(input.country || 'Türkiye')
    const city = normalizeRequiredString(input.city)
    const district = normalizeRequiredString(input.district)
    const address = normalizeRequiredString(input.address)
    const isTurkey = sameText(country, 'Türkiye') || sameText(country, 'Turkey') || sameText(country, 'TR')
    const documents = normalizeDocuments(input.document_files, input.document_meta)
    if (!branchName) return fail('Şube adı boş olamaz.', 'BRANCH_NAME_REQUIRED', 400, { fieldErrors: { branch_name: 'Şube adı zorunludur.' } })
    if (!address) return fail('Şube adresi boş olamaz.', 'BRANCH_ADDRESS_REQUIRED', 400, { fieldErrors: { address: 'Açık adres zorunludur.' } })
    if (isTurkey && (!city || !district)) return fail('Türkiye adreslerinde il ve ilçe referans seçimi zorunludur.', 'TURKEY_LOCATION_REQUIRED', 400)
    if (input.is_official_branch && (!input.opening_decision_date || !input.opening_registration_date)) return fail('Resmi şube açılışı için karar ve tescil tarihi zorunludur.', 'OFFICIAL_BRANCH_DATES_REQUIRED', 400)
    if (input.is_official_branch && !documents.length) return fail('Resmi şube açılışı için en az bir karar/tescil belgesi eklenmelidir.', 'BRANCH_OPENING_DOCUMENT_REQUIRED', 400)
    if ((precheck.branches || []).some(branch => isActiveBranch(branch) && sameText(branch.branch_name, branchName))) return fail('Aynı şirket altında aynı isimle aktif şube bulunuyor.', 'ACTIVE_BRANCH_NAME_DUPLICATE', 409, { fieldErrors: { branch_name: 'Bu isimle aktif şube var.' } })
    const dateValidation = validateOfficialDates({ decisionDate: input.opening_decision_date, registrationDate: input.opening_registration_date, tradeRegistryGazetteDate: input.trade_registry_gazette_date })
    if (!dateValidation.ok) return fail(dateValidation.message, dateValidation.code, 400)

    const organizationUnit = input.create_organization_unit
      ? await createBranchOrganizationUnit({
        supabase,
        companyId,
        tenantContext: access.tenantContext,
        branchName: normalizeOptionalString(input.organization_unit_name) || branchName,
        branchShortName: input.branch_short_name || null,
        parentUnitId: input.parent_organization_unit_id || null,
        startDate: input.opening_registration_date || input.opening_decision_date,
        locationName: [district, city].filter(Boolean).join(', ') || null,
        notes: input.notes || null,
      })
      : null

    const facility = input.create_facility
      ? await createBranchFacility({
        supabase,
        companyId,
        tenantContext: access.tenantContext,
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
        userId: access.userId || null,
      })
      : null

    const now = new Date().toISOString()
    const branchPayload = withTenantInsertScopeForTable({
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
      created_by: access.userId || null,
      updated_by: access.userId || null,
      created_at: now,
      updated_at: now,
      version: 1,
      is_deleted: false,
    }, 'company_branches', access.tenantContext)

    const { data: branch, error: branchError } = await supabase.from('company_branches').insert(branchPayload).select(OFFICIAL_BRANCH_SELECT).single()
    if (branchError) throw branchError
    const createdBranch = branch as Record<string, any>
    const linkedFacility = facility
      ? await attachFacilityToBranch({
        supabase,
        facilityId: facility.id,
        branchId: createdBranch.id,
        tenantContext: access.tenantContext,
        userId: access.userId || null,
      })
      : null
    const changedFields = Object.keys(branchPayload).filter(field => !['tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'version', 'is_deleted'].includes(field))
    const transaction = await insertOfficialChangeTransaction({
      supabase,
      companyId,
      branchId: createdBranch.id,
      tenantContext: access.tenantContext,
      userId: access.userId,
      operationId: operation?.id || null,
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
    await insertOfficialLifecycleEvent({ supabase, companyId, tenantContext: access.tenantContext, userId: access.userId, transaction, eventType: 'company_branch_opening_completed', eventDate: input.opening_registration_date || input.opening_decision_date })
    const result = { company: precheck.current, transaction, branch: createdBranch, organization_unit: organizationUnit, facility: linkedFacility || facility }
    if (operation) {
      await operationService.markCompleted(operation.id, result, dateValidation.warnings)
      await new OutboxEventService(supabase as any).enqueue({
        tenantId: access.tenantContext.tenantId,
        companyId,
        moduleKey: 'sirket',
        eventType: OFFICIAL_CHANGE_EVENT_TYPES.branch_opening,
        aggregateType: 'company_branch',
        aggregateId: createdBranch.id,
        operationId: operation.id,
        payload: { company_id: companyId, branch_id: createdBranch.id, transaction_id: transaction.id, organization_unit_id: organizationUnit?.id || null, facility_id: (linkedFacility || facility)?.id || null },
      }).catch(() => null)
    }
    return officialChangeSuccess(result, operation ? { id: operation.id, operation_status: 'completed' } : null)
  } catch (error: any) {
    const message = error?.message || 'Şube açılışı tamamlanamadı.'
    if (operation) await operationService.markFailed(operation.id, { code: error?.code || 'BRANCH_OPENING_FAILED', message })
    return officialChangeError(message, error?.code || 'BRANCH_OPENING_FAILED', 500, undefined, operation ? { id: operation.id, operation_status: 'failed' } : null)
  }
}
