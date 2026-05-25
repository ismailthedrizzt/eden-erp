import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { listMeta, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { requirePermission } from '@/lib/security/serverPermissions'
import { applyTenantQueryScope, resolveTenantContext, type TenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { findGlobalOrganizationByIdentity, getTenantCompanyScope, isWritableCompanyScope, normalizeLegalCountry, normalizeLegalTaxNumber } from '@/lib/tenancy/companyScopes'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import { duplicateOperationJsonResponse } from '@/lib/operations/apiResponse'
import { resolveClientRequestId, stripOperationControlFields } from '@/lib/operations/idempotency'
import { operationStatusMessage } from '@/lib/operations/operationStatus'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { isMissingTableError } from '@/lib/modules/companies/companyErrors'

const REPRESENTATIVE_LIST_SELECT = 'id,company_id,person_id,organization_id,person_kind,source_type,source_id,display_name,full_name,authority_types,job_title,authority_type,status,record_status,start_date,end_date,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,requires_joint_signature,can_approve_alone,representative_profile,is_deleted,created_at,updated_at,version'
const CURRENT_AUTHORITY_SELECT = 'representative_id,company_id,tenant_id,authority_status,authority_record_status,authority_status_label,authority_types,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,limits,scope,requires_joint_signature,can_approve_alone,effective_date,end_date,warnings,last_transaction_id,last_transaction_type,display_name,person_id,organization_id'

const REPRESENTATIVE_AUTHORITY_CONTROLLED_FIELDS = new Set([
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
  'authority_documents',
  'authority_status',
  'authority_record_status',
  'authority_effect_status',
  'transaction_status',
  'approval_status',
  'workflow_status',
])

const RepresentativeSchema = z.object({
  company_id: z.string().uuid(),
  person_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  person_or_entity_type: z.enum(['person', 'organization']).default('person'),
  source_type: z.string().optional(),
  source_id: z.string().optional(),
  display_name: z.string().min(1),
  identity_number: z.string().optional(),
  photo_logo: z.array(z.record(z.any())).optional(),
  authority_documents: z.array(z.record(z.any())).optional(),
  notes: z.string().optional(),
  timeline: z.array(z.record(z.any())).optional(),
  representative_profile: z.record(z.any()).optional(),
}).passthrough()

function omitNullishValues(value: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  )
}

function stripRepresentativeCreateLifecycleFields(body: Record<string, any>) {
  const next = { ...body }
  delete next.status
  delete next.record_status
  delete next.current_authority
  delete next.authority_transaction_history
  REPRESENTATIVE_AUTHORITY_CONTROLLED_FIELDS.forEach(field => {
    delete next[field]
  })
  return next
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'representatives.view')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const { searchParams } = new URL(request.url)
  const listQuery = parseListQuery(searchParams, { pageSize: 50, sort: 'created_at', direction: 'desc' })
  const { from, to } = listRange(listQuery)
  const sortMap: Record<string, string> = {
    display_name: 'display_name',
    full_name: 'full_name',
    job_title: 'job_title',
    authority_type: 'authority_type',
    status: 'status',
    record_status: 'record_status',
    created_at: 'created_at',
  }
  const sortColumn = sortMap[listQuery.sort || ''] || 'created_at'
  const companyId = searchParams.get('company_id')
  const status = searchParams.get('status')
  const statuses = (searchParams.get('statuses') || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  const authorityStatuses = (searchParams.get('authority_statuses') || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  const normalizedAuthorityStatuses = normalizeRepresentativeAuthorityStatusFilters(authorityStatuses)
  const includePassive = listQuery.includePassive

  let authorityFilteredIds: string[] | null = null
  const includeAuthorityDraft = normalizedAuthorityStatuses.includes('draft')
  const authorityViewStatuses = normalizedAuthorityStatuses.filter(statusValue => statusValue !== 'draft')
  if (authorityViewStatuses.length) {
    let authorityFilterQuery = supabase
      .from('v_current_representative_authorities')
      .select('representative_id')
      .in('authority_record_status', authorityViewStatuses)
    authorityFilterQuery = applyTenantQueryScope(authorityFilterQuery, 'v_current_representative_authorities', tenantContext)
    if (companyId) authorityFilterQuery = authorityFilterQuery.eq('company_id', companyId)
    const { data: authorityMatches, error: authorityFilterError } = await authorityFilterQuery
    if (authorityFilterError) {
      if (isMissingTableError(authorityFilterError)) {
        authorityFilteredIds = []
      } else {
        return NextResponse.json({ error: authorityFilterError.message, code: authorityFilterError.code || 'AUTHORITY_FILTER_FAILED' }, { status: 500 })
      }
    } else {
      authorityFilteredIds = Array.from(new Set((authorityMatches || []).map(row => row.representative_id).filter(Boolean)))
    }
  } else if (normalizedAuthorityStatuses.length) {
    authorityFilteredIds = []
  }

  let query = supabase
    .from('company_representatives')
    .select(REPRESENTATIVE_LIST_SELECT, { count: 'exact' })
    .order(sortColumn, { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  query = applyTenantQueryScope(query, 'company_representatives', tenantContext)
  if (companyId) {
    const scope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
    if (!scope) return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    query = query.eq('company_id', companyId)
  }
  if (normalizedAuthorityStatuses.length) {
    if (includeAuthorityDraft && authorityFilteredIds?.length) {
      query = query.or(`id.in.(${authorityFilteredIds.join(',')}),record_status.eq.draft`)
    } else if (includeAuthorityDraft) {
      query = query.eq('record_status', 'draft')
    } else if (authorityFilteredIds?.length) {
      query = query.in('id', authorityFilteredIds)
    } else {
      return NextResponse.json({ data: [], meta: listMeta(listQuery, 0) })
    }
  }
  if (status) query = query.eq('status', status)
  const recordStatuses = normalizeRepresentativeMainStatusFilters(statuses)
  if (recordStatuses.length) {
    if (recordStatuses.includes('passive')) {
      const activeStatuses = recordStatuses.filter(item => item !== 'passive')
      query = activeStatuses.length
        ? query.or(`record_status.in.(${activeStatuses.join(',')}),record_status.eq.passive,is_deleted.eq.true`)
        : query.or('record_status.eq.passive,is_deleted.eq.true')
    } else {
      query = query.in('record_status', recordStatuses).eq('is_deleted', false)
    }
  } else if (!includePassive) query = query.eq('is_deleted', false).neq('record_status', 'passive')
  if (listQuery.search) query = query.or(`display_name.ilike.%${listQuery.search}%,full_name.ilike.%${listQuery.search}%,job_title.ilike.%${listQuery.search}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })

  const rows = await mergeCurrentRepresentativeAuthorities(supabase, data || [], tenantContext)
  return NextResponse.json({ data: rows, meta: listMeta(listQuery, count || 0) })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'representatives.insert')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const rawBody = await request.json()
  const clientRequestId = resolveClientRequestId(request, rawBody)
  const body = stripRepresentativeCreateLifecycleFields(omitNullishValues(stripOperationControlFields(rawBody)))
  const parsed = RepresentativeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const scopeResponse = await requireWritableCompanyScope(supabase, tenantContext, parsed.data.company_id)
  if (scopeResponse) return scopeResponse

  const operationService = new OperationRequestService(supabase as any)
  const operationCreate = await operationService.createOrGet({
    tenantId: tenantContext.tenantId,
    companyId: parsed.data.company_id,
    moduleKey: 'sirket',
    entityType: 'company_representative',
    operationType: 'representative.create',
    clientRequestId,
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
    const row = await attachRepresentativeIdentity(supabase, parsed.data, mapRepresentativeCardForDb(parsed.data), tenantContext)
    if (!row.company_id) {
      if (operation) await operationService.markFailed(operation.id, { code: 'COMPANY_REQUIRED', error: 'Bağlı şirket bulunamadı' })
      return NextResponse.json({ error: 'Bağlı şirket bulunamadı', code: 'COMPANY_REQUIRED' }, { status: 400 })
    }
    const existingRepresentative = await findExistingCompanyRepresentative(supabase, row, tenantContext)
    if (existingRepresentative) {
      if (operation) await operationService.markFailed(operation.id, {
        code: 'DUPLICATE_REPRESENTATIVE',
        error: 'Bu şirket için aynı kişi/kurum adına temsilci kartı zaten var.',
      })
      const [hydratedExisting] = await mergeCurrentRepresentativeAuthorities(supabase, [existingRepresentative], tenantContext)
      return NextResponse.json({
        error: 'Bu şirket için aynı kişi/kurum adına temsilci kartı zaten var.',
        code: 'DUPLICATE_REPRESENTATIVE',
        data: hydratedExisting,
        details: { existing_id: existingRepresentative.id },
      }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('company_representatives')
      .insert(withTenantInsertScopeForTable(row, 'company_representatives', tenantContext))
      .select(REPRESENTATIVE_LIST_SELECT)
      .single()

    if (error) {
      if (operation) await operationService.markFailed(operation.id, { code: error.code || 'CREATE_FAILED', error: error.message })
      return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
    }
    if (data?.person_id) await syncMasterContact(supabase, 'person', data.person_id, parsed.data)
    if (data?.organization_id) await syncMasterContact(supabase, 'organization', data.organization_id, parsed.data)
    if (Array.isArray(parsed.data.entity_bank_accounts)) {
      const kind = data?.person_id ? 'person' : data?.organization_id ? 'organization' : null
      const masterId = data?.person_id || data?.organization_id
      if (kind && masterId) await new EntityBankAccountsService(supabase as any).syncMany(kind, masterId, parsed.data.entity_bank_accounts, null)
    }
    const hydrated = data?.person_id
      ? await hydrateMasterContact(supabase, 'person', data)
      : data?.organization_id
        ? await hydrateMasterContact(supabase, 'organization', data)
        : data

    if (operation) {
      await operationService.markCompleted(operation.id, { id: hydrated.id, data: hydrated })
      await new OutboxEventService(supabase as any).enqueue({
        tenantId: tenantContext.tenantId,
        companyId: hydrated.company_id || parsed.data.company_id,
        moduleKey: 'sirket',
        eventType: 'representative.created',
        aggregateType: 'company_representative',
        aggregateId: hydrated.id,
        operationId: operation.id,
        payload: { id: hydrated.id, company_id: hydrated.company_id || parsed.data.company_id },
      }).catch(() => null)
    }

    return NextResponse.json({
      data: hydrated,
      ...(operation ? {
        operation_id: operation.id,
        operation_status: 'completed',
        message: operationStatusMessage('completed'),
      } : {}),
    }, { status: 201 })
  } catch (error: any) {
    if (operation) await operationService.markFailed(operation.id, {
      code: error?.code || 'REPRESENTATIVE_CREATE_FAILED',
      error: error?.message || 'Temsilci oluşturulamadı.',
    })
    return NextResponse.json({
      error: error?.message || 'Temsilci oluşturulamadı.',
      code: error?.code || 'REPRESENTATIVE_CREATE_FAILED',
      ...(operation ? {
        operation_id: operation.id,
        operation_status: 'failed',
        message: operationStatusMessage('failed'),
      } : {}),
    }, { status: 500 })
  }
}

function normalizeAuthorityType(value: unknown) {
  return String(value || '').trim()
}

function normalizeRepresentativeMainStatusFilters(values: string[]) {
  const allowed = new Set(['draft', 'active', 'passive'])
  return values.filter(value => allowed.has(value))
}

function normalizeRepresentativeAuthorityStatusFilters(values: string[]) {
  const allowed = new Set(['draft', 'active', 'suspended', 'expired', 'terminated'])
  return values.filter(value => allowed.has(value))
}

function mapRepresentativeCardForDb(representative: Record<string, any>) {
  return {
    company_id: representative.company_id,
    full_name: representative.display_name || buildDisplayName(representative) || 'Temsilci',
    person_kind: representative.person_or_entity_type,
    source_type: representative.source_type || (representative.person_or_entity_type === 'organization' ? 'master_organization' : 'master_person'),
    source_id: representative.source_id || null,
    display_name: representative.display_name || buildDisplayName(representative),
    status: 'Taslak',
    record_status: 'draft',
    notes: representative.notes || null,
    photo_logo: representative.photo_logo || [],
    representative_profile: stripMasterDataForRoleProfile(representative),
    history: [],
    is_deleted: false,
  }
}

function buildDisplayName(source: Record<string, any>) {
  return source.person_or_entity_type === 'organization'
    ? source.trade_name || source.short_name || ''
    : [source.first_name, source.last_name].filter(Boolean).join(' ').trim()
}

async function requireWritableCompanyScope(
  supabase: ReturnType<typeof createServiceClient>,
  tenantContext: TenantContext,
  companyId?: string | null
) {
  if (!companyId) return NextResponse.json({ error: 'Bağlı şirket bulunamadı', code: 'COMPANY_REQUIRED' }, { status: 400 })
  const scope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
  if (!scope) return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
  if (!isWritableCompanyScope(scope)) {
    return NextResponse.json({ error: 'Bu şirket için yalnızca görüntüleme yetkiniz var.', code: 'COMPANY_SCOPE_READONLY' }, { status: 403 })
  }
  return null
}

async function attachRepresentativeIdentity(
  supabase: ReturnType<typeof createServiceClient>,
  representative: Record<string, any>,
  row: Record<string, any>,
  tenantContext: TenantContext
) {
  try {
    const kind = representative.person_or_entity_type === 'organization' ? 'organization' : 'person'
    if (kind === 'person') {
      if (representative.person_id) return { ...row, person_id: representative.person_id, source_id: row.source_id || representative.person_id }

      const fullName = representative.display_name || buildDisplayName(representative)
      const nationalId = representative.identity_number && String(representative.identity_number).length === 11 ? String(representative.identity_number) : null
      const passportNo = nationalId ? null : representative.passport_no || representative.identity_number || null
      const nationality = normalizeCountryId(representative.nationality || representative.nationality_country || 'TR')
      let personQuery = supabase.from('persons').select('id')
      personQuery = nationalId
        ? personQuery.eq('nationality', nationality).eq('national_id', nationalId)
        : passportNo
          ? personQuery.eq('nationality', nationality).eq('passport_no', passportNo)
          : personQuery.eq('full_name', fullName)
      personQuery = applyTenantQueryScope(personQuery, 'persons', tenantContext)
      const { data: existing, error: findError } = await personQuery.maybeSingle()
      if (findError) return row
      const personId = existing?.id || (await supabase.from('persons').insert(withTenantInsertScopeForTable({
        first_name: representative.first_name || null,
        last_name: representative.last_name || null,
        full_name: fullName,
        nationality,
        national_id: nationalId,
        passport_no: passportNo,
        phone: representative.phone || null,
        email: representative.email || null,
        address: representative.address || null,
        city: representative.city || null,
        district: representative.district || null,
        metadata_json: { source: 'representatives_create' },
      }, 'persons', tenantContext)).select('id').single()).data?.id
      return { ...row, person_id: personId || null, source_id: row.source_id || personId || null }
    }

    const legalName = representative.trade_name || representative.display_name
    if (representative.organization_id) return { ...row, organization_id: representative.organization_id, source_id: row.source_id || representative.organization_id }

    const country = normalizeLegalCountry(representative.country || representative.nationality_country || 'TR')
    const taxNumber = normalizeLegalTaxNumber(representative.identity_number || null, country)
    const existing = await findGlobalOrganizationByIdentity(supabase, {
      country,
      taxNumber,
      legalName,
      select: 'id',
    }).catch(() => null)
    const organizationId = existing?.id || (await supabase.from('organizations').insert({
      legal_name: legalName,
      short_name: representative.short_name || null,
      country,
      tax_number: taxNumber,
      tax_office: representative.tax_office || null,
      organization_type: representative.company_type || null,
      registration_number: representative.trade_registry_no || representative.mersis_number || null,
      phone: representative.phone || null,
      email: representative.email || null,
      address: representative.address || null,
      city: representative.city || null,
      district: representative.district || null,
      metadata_json: { source: 'representatives_create' },
    }).select('id').single()).data?.id
    return { ...row, organization_id: organizationId || null, source_id: row.source_id || organizationId || null }
  } catch {
    return row
  }
}

function normalizeAuthorityTypes(value: unknown) {
  const source = Array.isArray(value) ? value : [value]
  return Array.from(new Set(source.map(normalizeAuthorityType).filter(Boolean)))
}

function toNullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

async function findExistingCompanyRepresentative(
  supabase: ReturnType<typeof createServiceClient>,
  row: Record<string, any>,
  tenantContext: TenantContext
) {
  const masterColumn = row.person_id ? 'person_id' : row.organization_id ? 'organization_id' : null
  const masterId = row.person_id || row.organization_id || null
  if (!row.company_id || !masterColumn || !masterId) return null

  let query = supabase
    .from('company_representatives')
    .select(REPRESENTATIVE_LIST_SELECT)
    .eq('company_id', row.company_id)
    .eq(masterColumn, masterId)
    .eq('is_deleted', false)
    .limit(1)
  query = applyTenantQueryScope(query, 'company_representatives', tenantContext)
  const { data, error } = await query
  if (error) throw error
  return Array.isArray(data) ? data[0] || null : null
}

async function mergeCurrentRepresentativeAuthorities(
  supabase: ReturnType<typeof createServiceClient>,
  rows: Record<string, any>[],
  tenantContext: TenantContext
) {
  if (!rows.length) return rows
  const representativeIds = rows.map(row => row.id)
  let query = supabase
    .from('v_current_representative_authorities')
    .select(CURRENT_AUTHORITY_SELECT)
    .in('representative_id', representativeIds)
  query = applyTenantQueryScope(query, 'v_current_representative_authorities', tenantContext)
  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) return rows
    throw error
  }

  let transactionQuery = supabase
    .from('company_representative_authority_transactions')
    .select('id,representative_id,transaction_type,effective_date,approval_status,workflow_status,status,created_at')
    .in('representative_id', representativeIds)
    .eq('is_deleted', false)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false })
  transactionQuery = applyTenantQueryScope(transactionQuery, 'company_representative_authority_transactions', tenantContext)
  const { data: transactionRows, error: transactionError } = await transactionQuery
  if (transactionError && !isMissingTableError(transactionError)) throw transactionError

  const currentByRepresentative = Object.fromEntries((data || []).map(row => [row.representative_id, row]))
  const lastTransactionByRepresentative: Record<string, Record<string, any>> = {}
  for (const transaction of transactionRows || []) {
    if (!lastTransactionByRepresentative[transaction.representative_id]) {
      lastTransactionByRepresentative[transaction.representative_id] = transaction
    }
  }
  return rows.map(row => {
    const current = currentByRepresentative[row.id] as Record<string, any> | undefined
    const lastTransaction = lastTransactionByRepresentative[row.id]
    if (!current) return { ...row, last_authority_transaction: lastTransaction || null }
    return {
      ...row,
      current_authority: current,
      last_authority_transaction: lastTransaction || null,
      authority_status: current.authority_status || null,
      authority_record_status: current.authority_record_status || null,
      authority_start_date: current.effective_date || null,
      authority_end_date: current.end_date || null,
      authority_types: current.authority_types || row.authority_types,
      job_title: Array.isArray(current.authority_types) ? current.authority_types[0] || row.job_title : row.job_title,
      signature_type: current.signature_type ?? row.signature_type,
      transaction_limit: current.transaction_limit ?? row.transaction_limit,
      currency: current.currency || row.currency,
      requires_joint_signature: current.requires_joint_signature ?? row.requires_joint_signature,
      can_approve_alone: current.can_approve_alone ?? row.can_approve_alone,
    }
  })
}
