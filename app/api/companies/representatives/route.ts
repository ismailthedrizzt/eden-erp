import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { listMetaFromRows, listRange, parseListQuery } from '@/lib/api/listEndpoint'
import { requirePermission } from '@/lib/security/serverPermissions'
import { applyTenantQueryScope, resolveTenantContext, type TenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { findGlobalOrganizationByIdentity, getTenantCompanyScope, isWritableCompanyScope, normalizeLegalCountry, normalizeLegalTaxNumber } from '@/lib/tenancy/companyScopes'

const RepresentativeSchema = z.object({
  company_id: z.string().uuid().optional(),  person_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  person_or_entity_type: z.enum(['person', 'organization']).default('person'),
  source_type: z.string().optional(),
  source_id: z.string().optional(),
  display_name: z.string().min(1),
  identity_number: z.string().optional(),
  status: z.enum(['Aktif', 'Pasif', 'Askıda', 'Süresi Dolmuş']).default('Aktif'),
  start_date: z.string().min(1),
  end_date: z.string().optional(),
  primary_authority_type: z.string().min(1),
  authority_types: z.array(z.string()).optional(),
  signature_type: z.string().optional(),
  authority_limit: z.coerce.number().optional(),
  currency: z.string().optional(),
  requires_joint_signature: z.boolean().default(false),
  can_approve_alone: z.boolean().default(false),
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
    created_at: 'created_at',
  }
  const sortColumn = sortMap[listQuery.sort || ''] || 'created_at'
  const companyId = searchParams.get('company_id')
  const status = searchParams.get('status')
  const includePassive = listQuery.includePassive

  let query = supabase
    .from('company_representatives')
    .select('id,company_id,person_id,organization_id,person_kind,source_type,source_id,display_name,full_name,authority_types,job_title,authority_type,status,start_date,end_date,signature_type,transaction_limit,currency,requires_joint_signature,can_approve_alone,is_deleted,created_at')
    .order(sortColumn, { ascending: listQuery.direction !== 'desc' })
    .range(from, to)

  query = applyTenantQueryScope(query, 'company_representatives', tenantContext)
  if (companyId) {
    const scope = await getTenantCompanyScope(supabase, tenantContext.tenantId, companyId)
    if (!scope) return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    query = query.or(`company_id.eq.${companyId},company_id.eq.${companyId}`)
  }
  if (status) query = query.eq('status', status)
  if (!includePassive) query = query.eq('is_deleted', false)
  if (listQuery.search) query = query.or(`display_name.ilike.%${listQuery.search}%,full_name.ilike.%${listQuery.search}%,job_title.ilike.%${listQuery.search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })

  const rows = data || []
  return NextResponse.json({ data: rows, meta: listMetaFromRows(listQuery, rows.length) })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'representatives.insert')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const body = omitNullishValues(await request.json())
  const parsed = RepresentativeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const row = await attachRepresentativeIdentity(supabase, parsed.data, mapRepresentativeForDb(parsed.data), tenantContext)
  if (!row.company_id) {
    return NextResponse.json({ error: 'Bağlı şirket bulunamadı', code: 'COMPANY_REQUIRED' }, { status: 400 })
  }

  const scopeResponse = await requireWritableCompanyScope(supabase, tenantContext, row.company_id)
  if (scopeResponse) return scopeResponse

  const { data, error } = await supabase
    .from('company_representatives')
    .insert(withTenantInsertScopeForTable(row, 'company_representatives', tenantContext))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'CREATE_FAILED' }, { status: 500 })
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
  return NextResponse.json({ data: hydrated }, { status: 201 })
}

function normalizeAuthorityType(value: unknown) {
  return String(value || '').trim()
}

function mapRepresentativeForDb(representative: Record<string, any>) {
  const authorityTypes = representative.authority_types?.length
    ? representative.authority_types.map(normalizeAuthorityType)
    : [normalizeAuthorityType(representative.primary_authority_type)].filter(Boolean)

  return {
    company_id: representative.company_id || representative.company_id,    full_name: representative.display_name || buildDisplayName(representative) || 'Temsilci',
    job_title: normalizeAuthorityType(representative.primary_authority_type) || null,
    authority_type: 'other',
    authority_types: authorityTypes,
    person_kind: representative.person_or_entity_type,
    source_type: representative.source_type || (representative.person_or_entity_type === 'organization' ? 'master_organization' : 'master_person'),
    source_id: representative.source_id || null,
    display_name: representative.display_name || buildDisplayName(representative),
    start_date: representative.start_date,
    end_date: representative.end_date || null,
    status: representative.status || 'Aktif',
    notes: representative.notes || null,
    signature_type: representative.signature_type || null,
    transaction_limit: representative.authority_limit || null,
    currency: representative.currency || 'TRY',
    requires_joint_signature: !!representative.requires_joint_signature,
    can_approve_alone: !!representative.can_approve_alone,
    photo_logo: representative.photo_logo || [],
    authority_documents: representative.authority_documents || [],
    representative_profile: stripMasterDataForRoleProfile(representative),
    history: representative.timeline || [],
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
  if (!companyId) return null
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
        address: representative.address || representative.address || null,
        city: representative.city || representative.city || null,
        district: representative.district || representative.district || null,
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
      address: representative.address || representative.address || null,
      city: representative.city || representative.city || null,
      district: representative.district || representative.district || null,
      metadata_json: { source: 'representatives_create' },
    }).select('id').single()).data?.id
    return { ...row, organization_id: organizationId || null, source_id: row.source_id || organizationId || null }
  } catch {
    return row
  }
}
