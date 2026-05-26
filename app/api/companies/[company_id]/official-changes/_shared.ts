import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import {
  applyTenantQueryScope,
  resolveTenantContext,
  type TenantContext,
  withTenantInsertScopeForTable,
} from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import { requirePermission } from '@/lib/security/serverPermissions'
import { requireBranchPermission } from '@/lib/modules/companies/branchPermissions'
import { buildFieldHistory } from '@/lib/crud/safeCrudService'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

type SupabaseClient = ReturnType<typeof createServiceClient>

export type OfficialChangeType =
  | 'title_change'
  | 'address_change'
  | 'public_registration_update'
  | 'branch_opening'
  | 'branch_closing'
  | 'branch_document_update'
  | 'nace_change'
  | 'activity_subject_change'

export const OFFICIAL_CHANGE_OPERATION_TYPES: Record<OfficialChangeType, string> = {
  title_change: 'company.title_change',
  address_change: 'company.address_change',
  public_registration_update: 'company.public_registration_update',
  branch_opening: 'company.branch_opening',
  branch_closing: 'company.branch_closing',
  branch_document_update: 'company.branch_document_update',
  nace_change: 'company.nace_change',
  activity_subject_change: 'company.activity_subject_change',
}

export const OFFICIAL_CHANGE_EVENT_TYPES: Record<OfficialChangeType, string> = {
  title_change: 'company.title_changed',
  address_change: 'company.address_changed',
  public_registration_update: 'company.public_registration_updated',
  branch_opening: 'company.branch_opened',
  branch_closing: 'company.branch_closed',
  branch_document_update: 'company.branch_documents_updated',
  nace_change: 'company.nace_changed',
  activity_subject_change: 'company.activity_subject_changed',
}

export const OFFICIAL_CHANGE_SELECT = [
  'id',
  'tenant_id',
  'company_id',
  'branch_id',
  'operation_id',
  'transaction_no',
  'transaction_type',
  'old_values',
  'new_values',
  'changed_fields',
  'document_files',
  'decision_date',
  'registration_date',
  'trade_registry_gazette_date',
  'trade_registry_gazette_number',
  'effective_date',
  'approval_status',
  'workflow_status',
  'status',
  'notes',
  'warnings',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
  'version',
  'is_deleted',
].join(',')

export const OFFICIAL_COMPANY_SELECT = [
  'id',
  'organization_id',
  'field_history',
  'short_name',
  'trade_name',
  'tax_number',
  'tax_office',
  'company_type',
  'country',
  'city',
  'district',
  'address',
  'postal_code',
  'phone',
  'email',
  'is_deleted',
  'record_status',
  'company_status',
  'mersis_number',
  'trade_registry_number',
  'foundation_date',
  'legal_entity',
  'electronic_notification_address',
  'trade_registry_office',
  'company_code',
  'e_invoice_taxpayer',
  'e_archive_taxpayer',
  'e_waybill_taxpayer',
  'sgk_workplace_registry_no',
  'sgk_province',
  'sgk_branch',
  'nace_codes',
  'risk_class',
  'activity_subject',
  'updated_at',
  'version',
].join(',')

export const OFFICIAL_NACE_SELECT = 'id,company_id,nace_code_id,is_primary,status,start_date,end_date,notes,is_deleted,created_at,updated_at,version,nace_code:nace_codes(id,nace_code,description,hazard_class,source_name,source_url,source_reference,valid_from,valid_to,is_active,last_checked_at)'

export const OfficialDocumentSchema = z.object({
  slotId: z.string(),
  storagePath: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  size: z.coerce.number().optional().nullable(),
  type: z.string().optional().nullable(),
  uploadedAt: z.any().optional().nullable(),
  status: z.string().optional().nullable(),
  version: z.coerce.number().optional().nullable(),
  url: z.string().optional().nullable(),
  previewUrl: z.string().optional().nullable(),
  thumbnailPath: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  document_date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

export const OfficialDocumentMetaSchema = z.record(z.object({
  document_date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})).default({})

export type OfficialChangePrecheck = {
  ok: boolean
  operation_enabled: boolean
  message: string
  reasons: string[]
  warnings: string[]
  blocking_reasons: string[]
  is_company_active: boolean
  company_status?: string
  record_status?: string
  current: Record<string, any>
  public_tax?: Record<string, any> | null
  public_sgk?: Record<string, any> | null
  public_registry?: Record<string, any> | null
  public_channels?: Record<string, any> | null
  branches?: Record<string, any>[]
  organization_units?: Record<string, any>[]
  facilities?: Record<string, any>[]
  selected_branch?: Record<string, any> | null
  impact?: Record<string, any> | null
  nace_codes?: Record<string, any>[]
  primary_nace?: Record<string, any> | null
  secondary_nace_codes?: Record<string, any>[]
  activity_subject?: string | null
}

export type OfficialNaceInputRow = {
  nace_code_id?: string | null
  nace_code?: string | null
  description?: string | null
  hazard_class?: string | null
  is_primary?: boolean | null
  notes?: string | null
}

export type ResolvedOfficialNaceRow = {
  nace_code_id: string
  is_primary: boolean
  notes?: string | null
  nace_code: Record<string, any>
}

export function officialChangeError(
  message: string,
  code: string,
  status = 400,
  details?: Record<string, unknown>,
  operation?: { id?: string | null; operation_status?: string | null } | null
) {
  return NextResponse.json({
    error: message,
    code,
    ...(details ? { details } : {}),
    ...(operation?.id ? {
      operation_id: operation.id,
      operation_status: operation.operation_status || 'failed',
    } : {}),
    message: 'İşlem tamamlanamadı',
  }, { status })
}

export function officialChangeSuccess(
  data: Record<string, any>,
  operation?: { id?: string | null; operation_status?: string | null } | null,
  status = 201
) {
  return NextResponse.json({
    data,
    ...(operation?.id ? {
      operation_id: operation.id,
      operation_status: operation.operation_status || 'completed',
    } : {}),
    message: 'İşlem tamamlandı',
  }, { status })
}

export function duplicateOfficialChangeResponse(operation: { id: string; operation_status: string; result_json?: any; error_json?: any }) {
  if (operation.operation_status === 'completed') {
    return officialChangeSuccess(operation.result_json || {}, operation, 200)
  }

  if (operation.operation_status === 'failed') {
    const error = operation.error_json || {}
    return officialChangeError(
      error.message || error.error || 'İşlem tamamlanamadı.',
      error.code || 'OPERATION_FAILED',
      409,
      error.details,
      operation
    )
  }

  return NextResponse.json({
    operation_id: operation.id,
    operation_status: operation.operation_status,
    message: 'İşlem işleniyor',
  }, { status: 202 })
}

export async function ensureOfficialChangeAccess(
  request: NextRequest,
  supabase: SupabaseClient,
  companyId: string,
  permissionKey = 'companies.view',
  fallbackPermissionKey?: string
) {
  const permission = fallbackPermissionKey
    ? await requireBranchPermission(request, supabase, permissionKey, fallbackPermissionKey)
    : await requirePermission(request, supabase, permissionKey)
  if (permission instanceof NextResponse) return { response: permission }

  const tenantContext = resolveTenantContext(request)
  const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
  if (!companyScope) {
    return { response: officialChangeError('Şirket bulunamadı.', 'COMPANY_NOT_FOUND', 404) }
  }
  if (permissionKey !== 'companies.view' && !isWritableCompanyScope(companyScope)) {
    return { response: officialChangeError('Bu şirket için yalnızca görüntüleme yetkiniz var.', 'COMPANY_SCOPE_READONLY', 403) }
  }

  return { tenantContext, userId: permission.userId }
}

export async function loadOfficialChangeContext(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext
) {
  let companyQuery = supabase
    .from('companies')
    .select(OFFICIAL_COMPANY_SELECT)
    .eq('id', companyId)
  companyQuery = applyTenantQueryScope(companyQuery, 'companies', tenantContext)
  const { data: company, error: companyError } = await companyQuery.maybeSingle()
  if (companyError) throw companyError
  if (!company) return null

  const [publicTax, publicSgk, publicRegistry, publicChannels] = await Promise.all([
    loadPublicRow(supabase, 'company_public_tax', companyId, tenantContext),
    loadPublicRow(supabase, 'company_public_sgk', companyId, tenantContext),
    loadPublicRow(supabase, 'company_public_registry', companyId, tenantContext),
    loadPublicRow(supabase, 'company_public_channels', companyId, tenantContext),
  ])

  return {
    company: company as Record<string, any>,
    public_tax: publicTax,
    public_sgk: publicSgk,
    public_registry: publicRegistry,
    public_channels: publicChannels,
  }
}

export async function buildOfficialChangePrecheck(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext,
  changeType: OfficialChangeType
): Promise<OfficialChangePrecheck> {
  const context = await loadOfficialChangeContext(supabase, companyId, tenantContext)
  if (!context) {
    return emptyPrecheck('Şirket bulunamadı.', ['Şirket bulunamadı.'])
  }

  const lifecycle = getCompanyLifecycle(context.company)
  const blockingReasons: string[] = []
  const warnings: string[] = []
  const blockedMessage = officialChangeBlockedMessage(lifecycle, changeType)
  if (blockedMessage) blockingReasons.push(blockedMessage)

  return {
    ok: blockingReasons.length === 0,
    operation_enabled: lifecycle === 'active',
    message: blockingReasons[0] || 'Ön kontrol tamamlandı. İşlem resmi değişiklik wizardı üzerinden başlatılabilir.',
    reasons: [],
    warnings,
    blocking_reasons: blockingReasons,
    is_company_active: lifecycle === 'active',
    company_status: String(context.company.company_status || ''),
    record_status: String(context.company.record_status || ''),
    current: context.company,
    public_tax: context.public_tax,
    public_sgk: context.public_sgk,
    public_registry: context.public_registry,
    public_channels: context.public_channels,
  }
}

export function getCompanyLifecycle(company: Record<string, any>) {
  if (company.is_deleted === true) return 'deregistered'
  const values = [company.record_status, company.company_status]
    .map(value => String(value || '').trim().toLocaleLowerCase('tr-TR'))
    .filter(Boolean)

  for (const value of values) {
    if (['draft', 'taslak'].includes(value)) return 'draft'
    if (['active', 'opened', 'aktif'].includes(value)) return 'active'
    if (['liquidation', 'tasfiye', 'tasfiye halinde'].includes(value)) return 'liquidation'
    if (['deregistered', 'passive', 'closed', 'deleted', 'pasif', 'kapalı', 'kapanmış', 'terkin'].includes(value)) return 'deregistered'
  }

  return values.length ? 'unknown' : 'active'
}

export function officialChangeBlockedMessage(lifecycle: string, changeType: OfficialChangeType) {
  if (lifecycle === 'active') return ''
  const label = officialChangeLabel(changeType)
  if (lifecycle === 'draft') {
    if (changeType === 'branch_opening' || changeType === 'branch_closing') {
      return `${label} taslak şirketlerde başlatılamaz. Şirket açılışı tamamlandıktan sonra resmi şube işlemi yapılabilir.`
    }
    return `${label} için taslak şirkette wizard zorunlu değildir. Alanları taslak form düzenleme akışından güncelleyebilirsiniz.`
  }
  if (lifecycle === 'liquidation') {
    return `${label} tasfiye halindeki şirketlerde varsayılan olarak kapalıdır.`
  }
  if (lifecycle === 'deregistered') {
    return `Terkin edilmiş şirketlerde ${label.toLocaleLowerCase('tr-TR')} başlatılamaz.`
  }
  return `${label} yalnızca aktif şirketlerde başlatılabilir.`
}

export function officialChangeLabel(changeType: OfficialChangeType) {
  if (changeType === 'title_change') return 'Unvan değişikliği'
  if (changeType === 'address_change') return 'Adres değişikliği'
  if (changeType === 'public_registration_update') return 'Kamu / tescil bilgisi güncelleme'
  if (changeType === 'branch_opening') return 'Şube açılışı'
  if (changeType === 'branch_closing') return 'Şube kapanışı'
  if (changeType === 'branch_document_update') return 'Şube belgeleri güncelleme'
  if (changeType === 'nace_change') return 'NACE / faaliyet kodu güncelleme'
  return 'Faaliyet konusu değişikliği'
}

export function normalizeDocuments(
  documents: Array<Record<string, any>>,
  meta: Record<string, { document_date?: string | null; description?: string | null }> = {}
) {
  return (documents || [])
    .filter(document => document && String(document.status || 'active') !== 'deleted')
    .map(document => {
      const slotId = String(document.slotId || '')
      return {
        slotId,
        storagePath: document.storagePath || null,
        documentId: document.documentId || document.storagePath || null,
        name: document.name || null,
        size: document.size ?? null,
        type: document.type || null,
        uploadedAt: document.uploadedAt || null,
        status: document.status || 'active',
        version: document.version ?? null,
        url: document.url || undefined,
        previewUrl: document.previewUrl || undefined,
        thumbnailPath: document.thumbnailPath || undefined,
        thumbnailUrl: document.thumbnailUrl || undefined,
        document_date: meta?.[slotId]?.document_date || document.document_date || null,
        description: meta?.[slotId]?.description || document.description || null,
      }
    })
}

export async function updateOfficialCompanyFields({
  supabase,
  companyId,
  tenantContext,
  userId,
  patch,
  baseVersion,
  baseUpdatedAt,
}: {
  supabase: SupabaseClient
  companyId: string
  tenantContext: TenantContext
  userId?: string | null
  patch: Record<string, any>
  baseVersion?: number | null
  baseUpdatedAt?: string | null
}) {
  const context = await loadOfficialChangeContext(supabase, companyId, tenantContext)
  if (!context) {
    return { ok: false as const, status: 404, code: 'COMPANY_NOT_FOUND', error: 'Şirket bulunamadı.' }
  }

  const company = context.company
  const conflict = detectCompanyConflict(company, baseVersion, baseUpdatedAt)
  if (conflict) return conflict

  const changedFields = changedFieldsForPatch(company, patch)
  if (!changedFields.length) {
    return { ok: true as const, company, previousCompany: company, changedFields: [] as string[] }
  }

  const now = new Date().toISOString()
  const cleanPatch = stripUndefined(pickPatchFields(patch, changedFields))
  cleanPatch.field_history = buildFieldHistory(company, cleanPatch, {
    ignoredFields: ['field_history'],
    userLabel: userId || 'Sistem Kullanıcısı',
  })
  cleanPatch.updated_at = now
  cleanPatch.updated_by = userId || null
  cleanPatch.version = Number(company.version || 1) + 1

  let updateQuery = supabase
    .from('companies')
    .update(cleanPatch)
    .eq('id', companyId)
  updateQuery = applyTenantQueryScope(updateQuery, 'companies', tenantContext)
  const { data, error } = await updateQuery.select(OFFICIAL_COMPANY_SELECT).single()
  if (error) {
    return { ok: false as const, status: 500, code: error.code || 'COMPANY_UPDATE_FAILED', error: error.message, details: error }
  }

  return {
    ok: true as const,
    company: data as Record<string, any>,
    previousCompany: company,
    changedFields,
  }
}

export async function updatePublicOfficialRow({
  supabase,
  tableName,
  companyId,
  tenantContext,
  userId,
  patch,
  action,
}: {
  supabase: SupabaseClient
  tableName: 'company_public_tax' | 'company_public_sgk' | 'company_public_registry' | 'company_public_channels'
  companyId: string
  tenantContext: TenantContext
  userId?: string | null
  patch: Record<string, any>
  action: string
}) {
  const current = await loadPublicRow(supabase, tableName, companyId, tenantContext)
  const changedFields = changedFieldsForPatch(current || {}, patch)
  if (!changedFields.length) return { row: current, changedFields: [] as string[] }

  const now = new Date().toISOString()
  const cleanPatch = stripUndefined(pickPatchFields(patch, changedFields))
  const history = [
    ...normalizeHistory(current?.history),
    {
      action,
      changed_fields: changedFields,
      old_values: pickValues(current || {}, changedFields),
      new_values: pickValues(cleanPatch, changedFields),
      changed_at: now,
      changed_by: userId || null,
    },
  ]

  if (current?.id) {
    let updateQuery = supabase
      .from(tableName)
      .update({ ...cleanPatch, history, updated_at: now })
      .eq('id', current.id)
    updateQuery = applyTenantQueryScope(updateQuery, tableName, tenantContext)
    const { data, error } = await updateQuery.select('*').single()
    if (error) throw error
    return { row: data as Record<string, any>, changedFields }
  }

  const insertRow = withTenantInsertScopeForTable({
    company_id: companyId,
    ...cleanPatch,
    history,
    created_at: now,
    updated_at: now,
  }, tableName, tenantContext)
  const { data, error } = await supabase.from(tableName).insert(insertRow).select('*').single()
  if (error) throw error
  return { row: data as Record<string, any>, changedFields }
}

export async function insertOfficialChangeTransaction({
  supabase,
  companyId,
  tenantContext,
  userId,
  operationId,
  branchId,
  transactionType,
  oldValues,
  newValues,
  changedFields,
  documentFiles,
  decisionDate,
  registrationDate,
  tradeRegistryGazetteDate,
  tradeRegistryGazetteNumber,
  effectiveDate,
  notes,
  warnings,
}: {
  supabase: SupabaseClient
  companyId: string
  tenantContext: TenantContext
  userId?: string | null
  operationId?: string | null
  branchId?: string | null
  transactionType: OfficialChangeType
  oldValues: Record<string, any>
  newValues: Record<string, any>
  changedFields: string[]
  documentFiles: Array<Record<string, any>>
  decisionDate?: string | null
  registrationDate?: string | null
  tradeRegistryGazetteDate?: string | null
  tradeRegistryGazetteNumber?: string | null
  effectiveDate?: string | null
  notes?: string | null
  warnings?: unknown[]
}) {
  const now = new Date().toISOString()
  const transactionNo = await nextOfficialChangeNo(supabase, transactionType)
  const row = withTenantInsertScopeForTable({
    company_id: companyId,
    branch_id: branchId || null,
    operation_id: operationId || null,
    transaction_no: transactionNo,
    transaction_type: transactionType,
    old_values: oldValues,
    new_values: newValues,
    changed_fields: changedFields,
    document_files: documentFiles,
    decision_date: emptyToNull(decisionDate),
    registration_date: emptyToNull(registrationDate),
    trade_registry_gazette_date: emptyToNull(tradeRegistryGazetteDate),
    trade_registry_gazette_number: emptyToNull(tradeRegistryGazetteNumber),
    effective_date: emptyToNull(effectiveDate || registrationDate || decisionDate),
    approval_status: 'approved',
    workflow_status: 'completed',
    status: 'completed',
    notes: emptyToNull(notes),
    warnings: warnings || [],
    created_by: userId || null,
    updated_by: userId || null,
    created_at: now,
    updated_at: now,
  }, 'company_official_change_transactions', tenantContext)

  const { data, error } = await supabase
    .from('company_official_change_transactions')
    .insert(row)
    .select(OFFICIAL_CHANGE_SELECT)
    .single()
  if (error) throw error
  return data as Record<string, any>
}

export async function insertOfficialLifecycleEvent({
  supabase,
  companyId,
  tenantContext,
  userId,
  transaction,
  eventType,
  eventDate,
}: {
  supabase: SupabaseClient
  companyId: string
  tenantContext: TenantContext
  userId?: string | null
  transaction: Record<string, any>
  eventType: string
  eventDate?: string | null
}) {
  const row = withTenantInsertScopeForTable({
    company_id: companyId,
    event_type: eventType,
    event_date: emptyToNull(eventDate) || new Date().toISOString().slice(0, 10),
    old_status: 'active',
    new_status: 'active',
    payload_json: {
      official_change_transaction_id: transaction.id,
      transaction_type: transaction.transaction_type,
      changed_fields: transaction.changed_fields || [],
    },
    created_at: new Date().toISOString(),
    created_by: userId || null,
  }, 'company_lifecycle_events', tenantContext)

  const { error } = await supabase.from('company_lifecycle_events').insert(row)
  if (error && !isMissingInfrastructureError(error)) throw error
}

export function hydrateOfficialCompanyResponse(
  company: Record<string, any>,
  context: {
    public_tax?: Record<string, any> | null
    public_sgk?: Record<string, any> | null
    public_registry?: Record<string, any> | null
    public_channels?: Record<string, any> | null
  }
) {
  return {
    ...company,
    public_tax: context.public_tax || {},
    public_sgk: context.public_sgk || {},
    public_registry: context.public_registry || {},
    public_channels: context.public_channels || {},
  }
}

export function changedFieldsForPatch(current: Record<string, any>, patch: Record<string, any>) {
  return Object.keys(patch).filter(field => {
    if (patch[field] === undefined) return false
    return !sameOfficialValue(patch[field], current[field])
  })
}

export function pickValues(source: Record<string, any>, fields: string[]) {
  return Object.fromEntries(fields.map(field => [field, source[field] ?? null]))
}

export function emptyToNull(value: unknown) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  return text ? text : null
}

export function normalizeOptionalString(value: unknown) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

export function normalizeRequiredString(value: unknown) {
  return String(value ?? '').trim()
}

export function sameText(left: unknown, right: unknown) {
  return normalizeRequiredString(left).toLocaleLowerCase('tr-TR') === normalizeRequiredString(right).toLocaleLowerCase('tr-TR')
}

export function validateOfficialDates(input: {
  decisionDate?: string | null
  registrationDate?: string | null
  tradeRegistryGazetteDate?: string | null
}) {
  const warnings: string[] = []
  const decisionTime = dateTime(input.decisionDate)
  const registrationTime = dateTime(input.registrationDate)
  const gazetteTime = dateTime(input.tradeRegistryGazetteDate)

  if (decisionTime && registrationTime && registrationTime < decisionTime) {
    return {
      ok: false as const,
      message: 'Tescil tarihi karar tarihinden önce olamaz.',
      code: 'REGISTRATION_DATE_BEFORE_DECISION',
      warnings,
    }
  }

  if (decisionTime && gazetteTime && gazetteTime < decisionTime) {
    warnings.push('Ticaret sicil gazetesi tarihi karar tarihinden önce görünüyor. Lütfen belge tarihini kontrol edin.')
  }

  return { ok: true as const, warnings }
}

export const OFFICIAL_BRANCH_SELECT = [
  'id',
  'tenant_id',
  'company_id',
  'organization_unit_id',
  'facility_id',
  'branch_name',
  'branch_short_name',
  'branch_type',
  'is_official_branch',
  'country',
  'city',
  'district',
  'neighborhood',
  'address',
  'postal_code',
  'phone',
  'email',
  'trade_registry_number',
  'trade_registry_office',
  'tax_office',
  'sgk_workplace_registry_no',
  'opening_decision_date',
  'opening_registration_date',
  'closing_decision_date',
  'closing_registration_date',
  'trade_registry_gazette_date',
  'trade_registry_gazette_number',
  'responsible_person_id',
  'status',
  'record_status',
  'start_date',
  'end_date',
  'notes',
  'document_files',
  'metadata_json',
  'created_at',
  'updated_at',
  'version',
  'is_deleted',
].join(',')

export const OFFICIAL_ORGANIZATION_UNIT_SELECT = 'id,company_id,parent_unit_id,unit_type_id,name,type,short_name,code,location_name,status,start_date,end_date,active,is_deleted'
export const OFFICIAL_FACILITY_SELECT = 'id,tenant_id,company_id,branch_id,facility_name,facility_type,country,city,district,neighborhood,address,postal_code,phone,email,status,record_status,start_date,end_date,notes,metadata_json,created_at,updated_at,version,is_deleted'

export async function buildBranchOpeningPrecheck(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext,
  input: { branchName?: string | null; address?: string | null } = {}
) {
  const base = await buildOfficialChangePrecheck(supabase, companyId, tenantContext, 'branch_opening')
  const [branches, organizationUnits, facilities] = await Promise.all([
    loadCompanyBranches(supabase, companyId, tenantContext),
    loadCompanyOrganizationUnits(supabase, companyId, tenantContext),
    loadCompanyFacilities(supabase, companyId, tenantContext),
  ])
  const warnings = [...(base.warnings || [])]
  const branchName = normalizeRequiredString(input.branchName)
  if (branchName && branches.some(branch => isActiveBranch(branch) && sameText(branch.branch_name, branchName))) {
    warnings.push('Aynı şirket altında aynı isimle aktif bir şube bulunuyor.')
  }
  const address = normalizeRequiredString(input.address)
  if (address && branches.some(branch => isActiveBranch(branch) && sameText(branch.address, address))) {
    warnings.push('Aynı adrese sahip aktif bir şube bulunuyor. Bu durum engel değildir; adresi kontrol edin.')
  }

  return {
    ...base,
    warnings,
    branches,
    organization_units: organizationUnits,
    facilities,
  }
}

export async function buildBranchClosingPrecheck(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext,
  selectedBranchId?: string | null
) {
  const base = await buildOfficialChangePrecheck(supabase, companyId, tenantContext, 'branch_closing')
  const [branches, organizationUnits, facilities] = await Promise.all([
    loadCompanyBranches(supabase, companyId, tenantContext),
    loadCompanyOrganizationUnits(supabase, companyId, tenantContext),
    loadCompanyFacilities(supabase, companyId, tenantContext),
  ])
  const activeBranches = branches.filter(isActiveBranch)
  const selectedBranch = selectedBranchId
    ? branches.find(branch => branch.id === selectedBranchId) || null
    : null
  const blockingReasons = [...(base.blocking_reasons || [])]
  const warnings = [...(base.warnings || [])]
  let impact: Record<string, any> | null = null

  if (base.ok && activeBranches.length === 0) {
    blockingReasons.push('Kapatılabilecek aktif şube bulunmuyor.')
  }
  if (selectedBranchId && !selectedBranch) {
    blockingReasons.push('Kapatılacak şube bu şirket altında bulunamadı.')
  }
  if (selectedBranch && !isActiveBranch(selectedBranch)) {
    blockingReasons.push('Kapalı veya pasif şube tekrar kapatılamaz.')
  }

  if (selectedBranch) {
    impact = await buildBranchImpact(supabase, selectedBranch, tenantContext)
    if ((impact.employee_count || 0) > 0 || (impact.position_count || 0) > 0) {
      warnings.push('Şubeye bağlı aktif kadro veya personel görünüyor. Kapanışta organizasyon birimi için aksiyon seçilmelidir.')
    }
  }

  return {
    ...base,
    ok: base.ok && blockingReasons.length === 0,
    operation_enabled: base.operation_enabled && blockingReasons.length === 0,
    message: blockingReasons[0] || base.message,
    warnings,
    blocking_reasons: blockingReasons,
    branches,
    organization_units: organizationUnits,
    facilities,
    selected_branch: selectedBranch,
    impact,
  }
}

export async function buildNaceChangePrecheck(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext
) {
  const base = await buildOfficialChangePrecheck(supabase, companyId, tenantContext, 'nace_change')
  const naceRows = await loadCompanyNaceCodes(supabase, companyId, tenantContext)
  const activeRows = activeOfficialNaceRows(naceRows)
  const primaryNace = activeRows.find(row => row.is_primary) || null

  return {
    ...base,
    nace_codes: activeRows,
    primary_nace: primaryNace,
    secondary_nace_codes: activeRows.filter(row => !row.is_primary),
    activity_subject: normalizeOptionalString(base.current?.activity_subject),
  }
}

export async function buildActivitySubjectChangePrecheck(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext
) {
  const base = await buildOfficialChangePrecheck(supabase, companyId, tenantContext, 'activity_subject_change')
  const naceRows = await loadCompanyNaceCodes(supabase, companyId, tenantContext)
  const activeRows = activeOfficialNaceRows(naceRows)
  const primaryNace = activeRows.find(row => row.is_primary) || null

  return {
    ...base,
    nace_codes: activeRows,
    primary_nace: primaryNace,
    secondary_nace_codes: activeRows.filter(row => !row.is_primary),
    activity_subject: normalizeOptionalString(base.current?.activity_subject),
  }
}

export async function loadCompanyNaceCodes(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext
) {
  let query = supabase
    .from('company_nace_codes')
    .select(OFFICIAL_NACE_SELECT)
    .eq('company_id', companyId)
    .eq('is_deleted', false)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })
  query = applyTenantQueryScope(query, 'company_nace_codes', tenantContext)
  const { data, error } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) return []
    throw error
  }
  return (data || []) as Record<string, any>[]
}

export function activeOfficialNaceRows(rows: Record<string, any>[]) {
  return (rows || []).filter(row => !row.is_deleted && String(row.status || 'active').toLocaleLowerCase('tr-TR') !== 'passive')
}

export async function resolveOfficialNaceRows(
  supabase: SupabaseClient,
  rows: OfficialNaceInputRow[]
) {
  const normalized = normalizeOfficialNaceInputRows(rows)
  const validation = validateOfficialNaceInputRows(normalized)
  if (!validation.ok) return validation

  const ids = normalized.map(row => row.nace_code_id).filter(Boolean) as string[]
  const codes = normalized.filter(row => !row.nace_code_id && row.nace_code).map(row => String(row.nace_code))
  const references: Record<string, any>[] = []

  if (ids.length) {
    const { data, error } = await supabase
      .from('nace_codes')
      .select('id,nace_code,description,hazard_class,source_name,source_url,source_reference,valid_from,valid_to,is_active,last_checked_at')
      .in('id', ids)
      .eq('is_active', true)
    if (error) {
      if (isMissingInfrastructureError(error)) {
        return { ok: false as const, code: 'NACE_REFERENCE_MISSING', message: 'NACE referans tablosu bulunamadı.' }
      }
      return { ok: false as const, code: error.code || 'NACE_REFERENCE_FAILED', message: error.message }
    }
    references.push(...(data || []))
  }

  if (codes.length) {
    const { data, error } = await supabase
      .from('nace_codes')
      .select('id,nace_code,description,hazard_class,source_name,source_url,source_reference,valid_from,valid_to,is_active,last_checked_at')
      .in('nace_code', codes)
      .eq('is_active', true)
    if (error) {
      if (isMissingInfrastructureError(error)) {
        return { ok: false as const, code: 'NACE_REFERENCE_MISSING', message: 'NACE referans tablosu bulunamadı.' }
      }
      return { ok: false as const, code: error.code || 'NACE_REFERENCE_FAILED', message: error.message }
    }
    references.push(...(data || []))
  }

  const byId = new Map(references.map(row => [row.id, row]))
  const byCode = new Map(references.map(row => [String(row.nace_code || '').trim(), row]))
  const resolved: ResolvedOfficialNaceRow[] = []

  for (const row of normalized) {
    const reference = row.nace_code_id ? byId.get(row.nace_code_id) : byCode.get(String(row.nace_code || '').trim())
    if (!reference) {
      return {
        ok: false as const,
        code: 'NACE_REFERENCE_INVALID',
        message: 'Seçilen NACE kodlarından biri aktif referans listesinde bulunamadı.',
      }
    }
    resolved.push({
      nace_code_id: reference.id,
      is_primary: !!row.is_primary,
      notes: normalizeOptionalString(row.notes),
      nace_code: reference,
    })
  }

  const duplicateResolvedIds = findDuplicates(resolved.map(row => row.nace_code_id))
  if (duplicateResolvedIds.length) {
    return {
      ok: false as const,
      code: 'NACE_DUPLICATE',
      message: 'Aynı NACE kodu birden fazla kez seçilemez.',
    }
  }

  return { ok: true as const, rows: resolved }
}

export function sameOfficialNaceSelection(currentRows: Record<string, any>[], nextRows: ResolvedOfficialNaceRow[]) {
  const currentActive = activeOfficialNaceRows(currentRows)
  const currentPrimary = currentActive.find(row => row.is_primary)?.nace_code_id || ''
  const nextPrimary = nextRows.find(row => row.is_primary)?.nace_code_id || ''
  const currentSecondary = currentActive.filter(row => !row.is_primary).map(row => row.nace_code_id).sort()
  const nextSecondary = nextRows.filter(row => !row.is_primary).map(row => row.nace_code_id).sort()
  return currentPrimary === nextPrimary && JSON.stringify(currentSecondary) === JSON.stringify(nextSecondary)
}

export function summarizeOfficialNaceRows(rows: Array<Record<string, any> | ResolvedOfficialNaceRow>) {
  return (rows || []).map(row => {
    const nace = (row as any).nace_code || {}
    return {
      nace_code_id: (row as any).nace_code_id || nace.id || null,
      nace_code: nace.nace_code || (row as any).nace_code || null,
      description: nace.description || (row as any).description || null,
      hazard_class: nace.hazard_class || (row as any).hazard_class || null,
      is_primary: !!(row as any).is_primary,
    }
  })
}

export async function syncOfficialNaceCodes({
  supabase,
  companyId,
  tenantContext,
  userId,
  rows,
  effectiveDate,
}: {
  supabase: SupabaseClient
  companyId: string
  tenantContext: TenantContext
  userId?: string | null
  rows: ResolvedOfficialNaceRow[]
  effectiveDate?: string | null
}) {
  const existingRows = await loadCompanyNaceCodes(supabase, companyId, tenantContext)
  const selectedSet = new Set(rows.map(row => row.nace_code_id))
  const now = new Date().toISOString()
  const effective = emptyToNull(effectiveDate) || now.slice(0, 10)
  const passivateIds = existingRows
    .filter(row => !row.is_deleted && String(row.status || 'active').toLocaleLowerCase('tr-TR') !== 'passive' && !selectedSet.has(row.nace_code_id))
    .map(row => row.id)

  if (passivateIds.length) {
    let passivateQuery = supabase
      .from('company_nace_codes')
      .update({
        status: 'passive',
        is_deleted: true,
        end_date: effective,
        updated_by: userId || null,
        updated_at: now,
      })
      .in('id', passivateIds)
    passivateQuery = applyTenantQueryScope(passivateQuery, 'company_nace_codes', tenantContext)
    const { error } = await passivateQuery
    if (error) throw error
  }

  for (const row of rows) {
    const existing = existingRows.find(item => item.nace_code_id === row.nace_code_id)
    if (existing) {
      let updateQuery = supabase
        .from('company_nace_codes')
        .update({
          is_primary: row.is_primary,
          status: 'active',
          is_deleted: false,
          end_date: null,
          notes: row.notes || existing.notes || null,
          updated_by: userId || null,
          updated_at: now,
        })
        .eq('id', existing.id)
      updateQuery = applyTenantQueryScope(updateQuery, 'company_nace_codes', tenantContext)
      const { error } = await updateQuery
      if (error) throw error
      continue
    }

    const { error } = await supabase
      .from('company_nace_codes')
      .insert(withTenantInsertScopeForTable({
        company_id: companyId,
        nace_code_id: row.nace_code_id,
        is_primary: row.is_primary,
        status: 'active',
        start_date: effective,
        notes: row.notes || null,
        created_by: userId || null,
        updated_by: userId || null,
        created_at: now,
        updated_at: now,
      }, 'company_nace_codes', tenantContext))
    if (error) throw error
  }

  const primaryRow = rows.find(row => row.is_primary)
  const warnings: string[] = []
  if (primaryRow) {
    const sgkPayload = withTenantInsertScopeForTable({
      company_id: companyId,
      nace_code: primaryRow.nace_code.nace_code || null,
      risk_class: primaryRow.nace_code.hazard_class || null,
      updated_at: now,
    }, 'company_public_sgk', tenantContext)
    const { error } = await supabase
      .from('company_public_sgk')
      .upsert(sgkPayload, { onConflict: 'company_id' })
    if (error) {
      if (isMissingInfrastructureError(error)) {
        warnings.push('SGK tehlike sınıfı tablosu bulunamadığı için sadece işlem uyarısı oluşturuldu.')
      } else {
        throw error
      }
    }
  }

  const nextRows = activeOfficialNaceRows(await loadCompanyNaceCodes(supabase, companyId, tenantContext))
  return {
    rows: nextRows,
    primary_nace: nextRows.find(row => row.is_primary) || null,
    secondary_nace_codes: nextRows.filter(row => !row.is_primary),
    warnings,
  }
}

export async function loadCompanyBranches(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext,
  options: { includeDeleted?: boolean } = {}
) {
  let query = supabase
    .from('company_branches')
    .select(OFFICIAL_BRANCH_SELECT)
    .eq('company_id', companyId)
    .order('branch_name', { ascending: true })
  if (!options.includeDeleted) query = query.eq('is_deleted', false)
  query = applyTenantQueryScope(query, 'company_branches', tenantContext)
  const { data, error } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) return []
    throw error
  }
  return (data || []) as Record<string, any>[]
}

export async function loadCompanyOrganizationUnits(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext
) {
  let query = supabase
    .from('organization_units')
    .select(OFFICIAL_ORGANIZATION_UNIT_SELECT)
    .eq('company_id', companyId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  query = applyTenantQueryScope(query, 'organization_units', tenantContext)
  const { data, error } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) return []
    throw error
  }
  return (data || []) as Record<string, any>[]
}

export async function loadCompanyFacilities(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext
) {
  let query = supabase
    .from('company_facilities')
    .select(OFFICIAL_FACILITY_SELECT)
    .eq('company_id', companyId)
    .eq('is_deleted', false)
    .order('facility_name', { ascending: true })
  query = applyTenantQueryScope(query, 'company_facilities', tenantContext)
  const { data, error } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) return []
    throw error
  }
  return (data || []) as Record<string, any>[]
}

export async function loadCompanyFacilityById(
  supabase: SupabaseClient,
  facilityId: string | null | undefined,
  tenantContext: TenantContext
) {
  if (!facilityId) return null
  let query = supabase
    .from('company_facilities')
    .select(OFFICIAL_FACILITY_SELECT)
    .eq('id', facilityId)
    .eq('is_deleted', false)
  query = applyTenantQueryScope(query, 'company_facilities', tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) {
    if (isMissingInfrastructureError(error)) return null
    throw error
  }
  return (data || null) as Record<string, any> | null
}

export function isActiveBranch(branch: Record<string, any>) {
  const values = [branch.record_status, branch.status]
    .map(value => String(value || '').trim().toLocaleLowerCase('tr-TR'))
    .filter(Boolean)
  return !branch.is_deleted && values.some(value => value === 'active' || value === 'aktif')
}

export async function createBranchOrganizationUnit({
  supabase,
  companyId,
  tenantContext,
  branchName,
  branchShortName,
  parentUnitId,
  startDate,
  locationName,
  notes,
}: {
  supabase: SupabaseClient
  companyId: string
  tenantContext: TenantContext
  branchName: string
  branchShortName?: string | null
  parentUnitId?: string | null
  startDate?: string | null
  locationName?: string | null
  notes?: string | null
}) {
  const { data: unitType, error: unitTypeError } = await supabase
    .from('organization_unit_types')
    .upsert({ name: 'Şube', slug: 'branch', color: '#0f766e', icon: 'Building2', sort_order: 70, is_active: true }, { onConflict: 'slug' })
    .select('id')
    .single()
  if (unitTypeError) {
    if (isMissingInfrastructureError(unitTypeError)) return null
    throw unitTypeError
  }

  const resolvedParentId = parentUnitId || await loadCompanyRootUnitId(supabase, companyId, tenantContext)
  const now = new Date().toISOString()
  const row = withTenantInsertScopeForTable({
    company_id: companyId,
    parent_unit_id: resolvedParentId || null,
    unit_type_id: unitType?.id || null,
    name: branchName,
    short_name: branchShortName || null,
    type: 'branch',
    location_name: locationName || null,
    status: 'Aktif',
    start_date: emptyToNull(startDate),
    notes: notes || null,
    active: true,
    is_deleted: false,
    created_at: now,
    updated_at: now,
  }, 'organization_units', tenantContext)

  const { data, error } = await supabase
    .from('organization_units')
    .insert(row)
    .select(OFFICIAL_ORGANIZATION_UNIT_SELECT)
    .single()
  if (error) throw error
  return data as Record<string, any>
}

export async function createBranchFacility({
  supabase,
  companyId,
  tenantContext,
  branchName,
  facilityName,
  branchType,
  country,
  city,
  district,
  neighborhood,
  address,
  postalCode,
  phone,
  email,
  startDate,
  notes,
  userId,
}: {
  supabase: SupabaseClient
  companyId: string
  tenantContext: TenantContext
  branchName: string
  facilityName?: string | null
  branchType?: string | null
  country?: string | null
  city?: string | null
  district?: string | null
  neighborhood?: string | null
  address?: string | null
  postalCode?: string | null
  phone?: string | null
  email?: string | null
  startDate?: string | null
  notes?: string | null
  userId?: string | null
}) {
  const now = new Date().toISOString()
  const row = withTenantInsertScopeForTable({
    company_id: companyId,
    branch_id: null,
    facility_name: normalizeOptionalString(facilityName) || branchName,
    facility_type: branchType === 'warehouse_facility' ? 'warehouse_facility' : 'branch_location',
    country: normalizeOptionalString(country),
    city: normalizeOptionalString(city),
    district: normalizeOptionalString(district),
    neighborhood: normalizeOptionalString(neighborhood),
    address: normalizeOptionalString(address),
    postal_code: normalizeOptionalString(postalCode),
    phone: normalizeOptionalString(phone),
    email: normalizeOptionalString(email),
    status: 'active',
    record_status: 'active',
    start_date: emptyToNull(startDate),
    notes: notes || null,
    metadata_json: {
      source: 'branch_opening',
      source_branch_name: branchName,
    },
    created_by: userId || null,
    updated_by: userId || null,
    created_at: now,
    updated_at: now,
    version: 1,
    is_deleted: false,
  }, 'company_facilities', tenantContext)

  const { data, error } = await supabase
    .from('company_facilities')
    .insert(row)
    .select(OFFICIAL_FACILITY_SELECT)
    .single()
  if (error) {
    if (isMissingInfrastructureError(error)) return null
    throw error
  }
  return data as Record<string, any>
}

export async function attachFacilityToBranch({
  supabase,
  facilityId,
  branchId,
  tenantContext,
  userId,
}: {
  supabase: SupabaseClient
  facilityId?: string | null
  branchId?: string | null
  tenantContext: TenantContext
  userId?: string | null
}) {
  if (!facilityId || !branchId) return null
  let query = supabase
    .from('company_facilities')
    .update({
      branch_id: branchId,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', facilityId)
  query = applyTenantQueryScope(query, 'company_facilities', tenantContext)
  const { data, error } = await query.select(OFFICIAL_FACILITY_SELECT).single()
  if (error) {
    if (isMissingInfrastructureError(error)) return null
    throw error
  }
  return data as Record<string, any>
}

export async function setOrganizationUnitPassive({
  supabase,
  unitId,
  tenantContext,
  endDate,
}: {
  supabase: SupabaseClient
  unitId: string
  tenantContext: TenantContext
  endDate?: string | null
}) {
  let query = supabase
    .from('organization_units')
    .update({
      status: 'Pasif',
      active: false,
      end_date: emptyToNull(endDate),
      updated_at: new Date().toISOString(),
    })
    .eq('id', unitId)
  query = applyTenantQueryScope(query, 'organization_units', tenantContext)
  const { data, error } = await query.select(OFFICIAL_ORGANIZATION_UNIT_SELECT).single()
  if (error && !isMissingInfrastructureError(error)) throw error
  return (data || null) as Record<string, any> | null
}

export async function updateOrganizationUnitForBranchClosing({
  supabase,
  companyId,
  unitId,
  action,
  targetUnitId,
  tenantContext,
  endDate,
}: {
  supabase: SupabaseClient
  companyId: string
  unitId?: string | null
  action: 'deactivate' | 'reassign' | 'keep_open'
  targetUnitId?: string | null
  tenantContext: TenantContext
  endDate?: string | null
}) {
  if (!unitId) return { ok: true as const, unit: null as Record<string, any> | null }
  if (action === 'deactivate') {
    const unit = await setOrganizationUnitPassive({ supabase, unitId, tenantContext, endDate })
    return { ok: true as const, unit }
  }
  if (action === 'keep_open') {
    const unit = await appendOrganizationUnitHistory({
      supabase,
      unitId,
      tenantContext,
      event: 'branch_closed_unit_kept_open',
      payload: { end_date: endDate || null },
    })
    return { ok: true as const, unit }
  }

  const validation = await validateOrganizationUnitReassignTarget({
    supabase,
    companyId,
    unitId,
    targetUnitId,
    tenantContext,
  })
  if (!validation.ok) return validation

  let query = supabase
    .from('organization_units')
    .update({
      parent_unit_id: targetUnitId,
      history: appendHistoryEntry(validation.unit?.history, 'branch_closed_unit_reassigned', {
        previous_parent_unit_id: validation.unit?.parent_unit_id || null,
        target_organization_unit_id: targetUnitId,
        end_date: endDate || null,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', unitId)
  query = applyTenantQueryScope(query, 'organization_units', tenantContext)
  const { data, error } = await query.select(OFFICIAL_ORGANIZATION_UNIT_SELECT).single()
  if (error) {
    if (isMissingInfrastructureError(error)) return { ok: true as const, unit: null }
    throw error
  }
  return { ok: true as const, unit: data as Record<string, any> }
}

export async function updateFacilityForBranchClosing({
  supabase,
  facilityId,
  action,
  tenantContext,
  endDate,
  userId,
}: {
  supabase: SupabaseClient
  facilityId?: string | null
  action: 'deactivate' | 'keep_open' | 'reuse'
  tenantContext: TenantContext
  endDate?: string | null
  userId?: string | null
}) {
  if (!facilityId) return null
  const facility = await loadCompanyFacilityById(supabase, facilityId, tenantContext)
  if (!facility) return null

  const now = new Date().toISOString()
  const updatePayload = action === 'deactivate'
    ? {
      status: 'closed',
      record_status: 'passive',
      end_date: emptyToNull(endDate),
      metadata_json: {
        ...(facility.metadata_json || {}),
        branch_closing_action: 'deactivate',
        branch_closed_facility_deactivated_at: now,
      },
    }
    : {
      status: action === 'reuse' ? 'reusable' : (facility.status || 'active'),
      record_status: facility.record_status || 'active',
      metadata_json: {
        ...(facility.metadata_json || {}),
        branch_closing_action: action,
        branch_closed_facility_kept_open_at: now,
        reusable_after_branch_closing: action === 'reuse',
      },
    }

  let query = supabase
    .from('company_facilities')
    .update({
      ...updatePayload,
      updated_by: userId || null,
      updated_at: now,
      version: Number(facility.version || 1) + 1,
    })
    .eq('id', facilityId)
  query = applyTenantQueryScope(query, 'company_facilities', tenantContext)
  const { data, error } = await query.select(OFFICIAL_FACILITY_SELECT).single()
  if (error) {
    if (isMissingInfrastructureError(error)) return null
    throw error
  }
  return data as Record<string, any>
}

async function appendOrganizationUnitHistory({
  supabase,
  unitId,
  tenantContext,
  event,
  payload,
}: {
  supabase: SupabaseClient
  unitId: string
  tenantContext: TenantContext
  event: string
  payload: Record<string, any>
}) {
  let currentQuery = supabase
    .from('organization_units')
    .select(`${OFFICIAL_ORGANIZATION_UNIT_SELECT},history`)
    .eq('id', unitId)
  currentQuery = applyTenantQueryScope(currentQuery, 'organization_units', tenantContext)
  const { data: current, error: currentError } = await currentQuery.maybeSingle()
  if (currentError) {
    if (isMissingInfrastructureError(currentError)) return null
    throw currentError
  }
  if (!current) return null

  let updateQuery = supabase
    .from('organization_units')
    .update({
      history: appendHistoryEntry((current as Record<string, any>).history, event, payload),
      updated_at: new Date().toISOString(),
    })
    .eq('id', unitId)
  updateQuery = applyTenantQueryScope(updateQuery, 'organization_units', tenantContext)
  const { data, error } = await updateQuery.select(OFFICIAL_ORGANIZATION_UNIT_SELECT).single()
  if (error) {
    if (isMissingInfrastructureError(error)) return null
    throw error
  }
  return data as Record<string, any>
}

async function validateOrganizationUnitReassignTarget({
  supabase,
  companyId,
  unitId,
  targetUnitId,
  tenantContext,
}: {
  supabase: SupabaseClient
  companyId: string
  unitId: string
  targetUnitId?: string | null
  tenantContext: TenantContext
}) {
  if (!targetUnitId) {
    return { ok: false as const, status: 400, code: 'TARGET_ORGANIZATION_UNIT_REQUIRED', error: 'Organizasyon birimi başka birime bağlanacaksa hedef birim seçilmelidir.', details: { fieldErrors: { target_organization_unit_id: 'Hedef birim zorunludur.' } } }
  }
  if (targetUnitId === unitId) {
    return { ok: false as const, status: 400, code: 'TARGET_ORGANIZATION_UNIT_SELF', error: 'Organizasyon birimi kendisine bağlanamaz.', details: { fieldErrors: { target_organization_unit_id: 'Kendi birimi seçilemez.' } } }
  }

  const units = await loadCompanyOrganizationUnits(supabase, companyId, tenantContext)
  const unit = units.find(row => row.id === unitId) || null
  const target = units.find(row => row.id === targetUnitId) || null
  if (!unit) {
    return { ok: false as const, status: 404, code: 'ORGANIZATION_UNIT_NOT_FOUND', error: 'Şubeye bağlı organizasyon birimi bulunamadı.' }
  }
  if (!target) {
    return { ok: false as const, status: 400, code: 'TARGET_ORGANIZATION_UNIT_NOT_IN_COMPANY', error: 'Hedef organizasyon birimi aynı şirket altında bulunmalıdır.', details: { fieldErrors: { target_organization_unit_id: 'Aynı şirketten hedef birim seçin.' } } }
  }
  const targetStatus = String(target.status || '').toLocaleLowerCase('tr-TR')
  if (target.is_deleted || target.active === false || ['passive', 'pasif', 'closed', 'kapalı'].includes(targetStatus)) {
    return { ok: false as const, status: 400, code: 'TARGET_ORGANIZATION_UNIT_INACTIVE', error: 'Kapalı veya pasif organizasyon birimine yeniden bağlama yapılamaz.', details: { fieldErrors: { target_organization_unit_id: 'Aktif hedef birim seçin.' } } }
  }
  if (wouldCreateOrganizationCycle(units, unitId, targetUnitId)) {
    return { ok: false as const, status: 400, code: 'ORGANIZATION_UNIT_CYCLE', error: 'Bu yeniden bağlama organizasyon ağacında döngü oluşturur.', details: { fieldErrors: { target_organization_unit_id: 'Alt birime bağlanamaz.' } } }
  }
  return { ok: true as const, unit, target }
}

function wouldCreateOrganizationCycle(units: Record<string, any>[], unitId: string, targetUnitId: string) {
  const byId = new Map(units.map(unit => [unit.id, unit]))
  let cursor = byId.get(targetUnitId)
  const seen = new Set<string>()
  while (cursor?.id && !seen.has(cursor.id)) {
    if (cursor.id === unitId) return true
    seen.add(cursor.id)
    cursor = cursor.parent_unit_id ? byId.get(cursor.parent_unit_id) : undefined
  }
  return false
}

function appendHistoryEntry(history: unknown, event: string, payload: Record<string, any>) {
  const rows = Array.isArray(history) ? history : []
  return [
    ...rows,
    {
      event,
      payload,
      changed_at: new Date().toISOString(),
    },
  ]
}

async function buildBranchImpact(
  supabase: SupabaseClient,
  branch: Record<string, any>,
  tenantContext: TenantContext
) {
  const unitId = branch.organization_unit_id
  const facilityId = branch.facility_id
  const warnings: string[] = []
  const positions = unitId ? await safeListRows({
    supabase,
    tenantContext,
    tableName: 'positions',
    select: 'id,title,status,active_count,is_deleted',
    label: 'Kadro',
    applyFilter: query => query.eq('unit_id', unitId).eq('is_deleted', false),
    warnings,
  }) : []
  const positionIds = positions.map((position: any) => position.id).filter(Boolean)

  const [employeesByUnit, employeesByPosition, openTaskCount, openProjectCount, openInventoryLocationCount, openServiceRecordCount] = await Promise.all([
    unitId ? safeEmployeeCount(supabase, tenantContext, query => query.eq('unit_id', unitId), warnings, 'Personel') : Promise.resolve(0),
    positionIds.length
      ? safeEmployeeCount(supabase, tenantContext, query => query.in('position_id', positionIds), warnings, 'Pozisyon personeli')
      : Promise.resolve(0),
    safeCountRows({
      supabase,
      tenantContext,
      tableName: 'project_management_tasks',
      label: 'Açık görev',
      applyFilter: query => query
        .eq('company_id', branch.company_id)
        .in('status', ['yeni', 'yapilacak', 'devam_ediyor', 'beklemede', 'incelemede'])
        .eq('record_status', 'active')
        .is('deleted_at', null)
        .or(`related_entity_id.eq.${branch.id}${unitId ? `,related_entity_id.eq.${unitId}` : ''}${facilityId ? `,related_entity_id.eq.${facilityId}` : ''}`),
      warnings,
    }),
    Promise.resolve(unsupportedRelationCount(warnings, 'Açık proje', 'Şube/facility proje ilişkisi henüz modellenmedi.')),
    safeCountRows({
      supabase,
      tenantContext,
      tableName: 'inventory_locations',
      label: 'Depo/stok lokasyonu',
      applyFilter: query => (facilityId ? query.eq('facility_id', facilityId) : query.eq('branch_id', branch.id)).eq('record_status', 'active'),
      warnings,
    }),
    Promise.resolve(unsupportedRelationCount(warnings, 'Aktif servis/saha kaydı', 'Şube/facility servis ilişkisi henüz modellenmedi.')),
  ])

  const activePositionCount = positions.filter((position: any) =>
    !['closed', 'kapalı', 'pasif', 'passive'].includes(String(position.status || '').toLocaleLowerCase('tr-TR'))
  ).length
  const employeeCount = Math.max(employeesByUnit, employeesByPosition)
  const openRelationCount = activePositionCount + employeeCount + openTaskCount + openProjectCount + openInventoryLocationCount + openServiceRecordCount

  return {
    organization_unit_id: unitId || null,
    facility_id: facilityId || null,
    position_count: positions.length,
    active_position_count: activePositionCount,
    employee_count: employeeCount,
    open_task_count: openTaskCount,
    open_project_count: openProjectCount,
    open_inventory_location_count: openInventoryLocationCount,
    open_service_record_count: openServiceRecordCount,
    open_relation_count: openRelationCount,
    warnings,
  }
}

function unsupportedRelationCount(warnings: string[], label: string, reason: string) {
  warnings.push(`${label} sayısı 0 kabul edildi. ${reason}`)
  return 0
}

async function safeEmployeeCount(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  applyFilter: (query: any) => any,
  warnings: string[] = [],
  label = 'Personel'
) {
  return safeCountRows({
    supabase,
    tenantContext,
    tableName: 'employees',
    label,
    applyFilter: query => applyFilter(query).eq('is_deleted', false),
    warnings,
  })
}

async function safeCountRows({
  supabase,
  tenantContext,
  tableName,
  label,
  applyFilter,
  warnings,
}: {
  supabase: SupabaseClient
  tenantContext: TenantContext
  tableName: string
  label: string
  applyFilter: (query: any) => any
  warnings: string[]
}) {
  let query = supabase.from(tableName).select('id', { count: 'exact', head: true })
  query = applyTenantQueryScope(query, tableName, tenantContext)
  query = applyFilter(query)
  const { count, error } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) {
      warnings.push(`${label} altyapısı veya ilişkisi henüz tanımlı olmadığı için sayı 0 kabul edildi.`)
      return 0
    }
    throw error
  }
  return count || 0
}

async function safeListRows({
  supabase,
  tenantContext,
  tableName,
  select,
  label,
  applyFilter,
  warnings,
}: {
  supabase: SupabaseClient
  tenantContext: TenantContext
  tableName: string
  select: string
  label: string
  applyFilter: (query: any) => any
  warnings: string[]
}) {
  let query = supabase.from(tableName).select(select)
  query = applyTenantQueryScope(query, tableName, tenantContext)
  query = applyFilter(query)
  const { data, error } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) {
      warnings.push(`${label} altyapısı veya ilişkisi henüz tanımlı olmadığı için sayı 0 kabul edildi.`)
      return []
    }
    throw error
  }
  return data || []
}

async function loadCompanyRootUnitId(
  supabase: SupabaseClient,
  companyId: string,
  tenantContext: TenantContext
) {
  let query = supabase
    .from('organization_units')
    .select('id')
    .eq('company_id', companyId)
    .is('parent_unit_id', null)
    .eq('type', 'company')
    .eq('is_deleted', false)
    .limit(1)
  query = applyTenantQueryScope(query, 'organization_units', tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error && !isMissingInfrastructureError(error)) throw error
  return data?.id || null
}

async function loadPublicRow(
  supabase: SupabaseClient,
  tableName: 'company_public_tax' | 'company_public_sgk' | 'company_public_registry' | 'company_public_channels',
  companyId: string,
  tenantContext: TenantContext
) {
  let query = supabase.from(tableName).select('*').eq('company_id', companyId)
  query = applyTenantQueryScope(query, tableName, tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return (data || null) as Record<string, any> | null
}

async function nextOfficialChangeNo(supabase: SupabaseClient, transactionType: OfficialChangeType) {
  const prefixes: Record<OfficialChangeType, string> = {
    title_change: 'UD',
    address_change: 'AD',
    public_registration_update: 'KT',
    branch_opening: 'SA',
    branch_closing: 'SK',
    branch_document_update: 'SB',
    nace_change: 'NC',
    activity_subject_change: 'FK',
  }
  const prefix = `${prefixes[transactionType]}-${new Date().getFullYear()}`
  const { count } = await supabase
    .from('company_official_change_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_type', transactionType)
  return `${prefix}-${String((count || 0) + 1).padStart(5, '0')}`
}

function normalizeOfficialNaceInputRows(rows: OfficialNaceInputRow[]) {
  return (rows || [])
    .map(row => ({
      nace_code_id: normalizeOptionalString(row.nace_code_id),
      nace_code: normalizeOptionalString(row.nace_code),
      is_primary: !!row.is_primary,
      notes: normalizeOptionalString(row.notes),
    }))
    .filter(row => row.nace_code_id || row.nace_code)
}

function validateOfficialNaceInputRows(rows: ReturnType<typeof normalizeOfficialNaceInputRows>) {
  if (!rows.length) {
    return { ok: false as const, code: 'NACE_REQUIRED', message: 'En az bir NACE kodu seçilmelidir.' }
  }
  if (rows.length > 5) {
    return { ok: false as const, code: 'NACE_LIMIT_EXCEEDED', message: 'Bir şirket için en fazla 5 aktif NACE kodu tanımlanabilir.' }
  }
  const primaryCount = rows.filter(row => row.is_primary).length
  if (primaryCount !== 1) {
    return { ok: false as const, code: 'PRIMARY_NACE_REQUIRED', message: 'Tam olarak bir birincil NACE kodu seçilmelidir.' }
  }
  const keys = rows.map(row => row.nace_code_id || row.nace_code || '')
  if (findDuplicates(keys).length) {
    return { ok: false as const, code: 'NACE_DUPLICATE', message: 'Aynı NACE kodu birden fazla kez seçilemez.' }
  }
  return { ok: true as const }
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  values.forEach(value => {
    const key = String(value || '').trim()
    if (!key) return
    if (seen.has(key)) duplicates.add(key)
    seen.add(key)
  })
  return Array.from(duplicates)
}

function detectCompanyConflict(
  company: Record<string, any>,
  baseVersion?: number | null,
  baseUpdatedAt?: string | null
) {
  if (baseVersion !== undefined && baseVersion !== null) {
    const currentVersion = Number(company.version)
    if (Number.isFinite(currentVersion) && currentVersion !== baseVersion) {
      return {
        ok: false as const,
        status: 409,
        code: 'VERSION_CONFLICT',
        error: 'Şirket kaydı bu işlem hazırlanırken değişmiş. Lütfen kaydı yenileyip tekrar deneyin.',
        details: { current_version: currentVersion, base_version: baseVersion },
      }
    }
  }

  if (baseUpdatedAt) {
    const currentUpdatedAt = normalizeDateForConflict(company.updated_at)
    const expectedUpdatedAt = normalizeDateForConflict(baseUpdatedAt)
    if (currentUpdatedAt && expectedUpdatedAt && currentUpdatedAt !== expectedUpdatedAt) {
      return {
        ok: false as const,
        status: 409,
        code: 'VERSION_CONFLICT',
        error: 'Şirket kaydı bu işlem hazırlanırken güncellenmiş. Lütfen kaydı yenileyip tekrar deneyin.',
        details: { current_updated_at: company.updated_at, base_updated_at: baseUpdatedAt },
      }
    }
  }

  return null
}

function normalizeDateForConflict(value: unknown) {
  const date = value ? new Date(String(value)) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

function pickPatchFields(patch: Record<string, any>, fields: string[]) {
  return Object.fromEntries(fields.map(field => [field, patch[field]]))
}

function stripUndefined(value: Record<string, any>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
}

function sameOfficialValue(nextValue: unknown, currentValue: unknown) {
  return JSON.stringify(normalizeComparableValue(nextValue)) === JSON.stringify(normalizeComparableValue(currentValue))
}

function normalizeComparableValue(value: unknown): unknown {
  if (value === undefined || value === '') return null
  if (typeof value === 'string') return value.trim()
  return value
}

function normalizeHistory(value: unknown) {
  return Array.isArray(value) ? value : []
}

function dateTime(value: string | null | undefined) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function emptyPrecheck(message: string, blockingReasons: string[]): OfficialChangePrecheck {
  return {
    ok: false,
    operation_enabled: false,
    message,
    reasons: [],
    warnings: [],
    blocking_reasons: blockingReasons,
    is_company_active: false,
    current: {},
    public_tax: null,
    public_sgk: null,
    public_registry: null,
    public_channels: null,
  }
}
