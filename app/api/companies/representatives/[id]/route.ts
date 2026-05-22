import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { requirePermission } from '@/lib/security/serverPermissions'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'

const REPRESENTATIVE_DETAIL_SELECT = 'id,company_id,company_id,person_id,organization_id,person_kind,source_type,source_id,display_name,full_name,phone,email,authority_types,job_title,authority_type,status,start_date,end_date,signature_type,transaction_limit,currency,requires_joint_signature,can_approve_alone,is_deleted,history,photo_logo,authority_documents,representative_profile,notes,created_at'

const TRACKED_FIELDS = new Set([
  'status',
  'authority_types',
  'signature_type',
  'transaction_limit',
  'start_date',
  'end_date',
  'source_type',
  'source_id',
])

function buildHistory(current: Record<string, any>, updates: Record<string, any>) {
  const existingHistory = Array.isArray(current.history) ? current.history : []
  const nextHistory = [...existingHistory]

  Object.entries(updates).forEach(([field, nextValue]) => {
    if (!TRACKED_FIELDS.has(field)) return
    const previousValue = current[field]
    if (JSON.stringify(previousValue ?? null) === JSON.stringify(nextValue ?? null)) return
    nextHistory.push({
      field,
      old_value: previousValue ?? '',
      new_value: nextValue ?? '',
      changed_at: new Date().toISOString(),
      changed_by: 'Sistem Kullanıcısı',
    })
  })

  return nextHistory
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'representatives.view')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)

  let query = supabase
    .from('company_representatives')
    .select(REPRESENTATIVE_DETAIL_SELECT)
    .eq('id', id)
  query = applyTenantQueryScope(query, 'company_representatives', tenantContext)
  const { data, error } = await query.single()

  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Temsilci bulunamadı', code: 'REPRESENTATIVE_NOT_FOUND' }, { status: 404 })
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  if (data?.company_id) {
    const scope = await getTenantCompanyScope(supabase, tenantContext.tenantId, data.company_id)
    if (!scope) return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
  }
  const hydrated = data?.person_id
    ? await hydrateMasterContact(supabase, 'person', data)
    : data?.organization_id
      ? await hydrateMasterContact(supabase, 'organization', data)
      : data
  return NextResponse.json(
    { data: hydrated },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'representatives.edit')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const body = await request.json()

  let currentQuery = supabase
    .from('company_representatives')
    .select(REPRESENTATIVE_DETAIL_SELECT)
    .eq('id', id)
  currentQuery = applyTenantQueryScope(currentQuery, 'company_representatives', tenantContext)
  const { data: current, error: currentError } = await currentQuery.single()

  if (currentError?.code === 'PGRST116') return NextResponse.json({ error: 'Temsilci bulunamadı', code: 'REPRESENTATIVE_NOT_FOUND' }, { status: 404 })
  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
  if (current.company_id) {
    const scope = await getTenantCompanyScope(supabase, tenantContext.tenantId, current.company_id)
    if (!scope) return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    if (!isWritableCompanyScope(scope)) return NextResponse.json({ error: 'Bu şirket için yalnızca görüntüleme yetkiniz var.', code: 'COMPANY_SCOPE_READONLY' }, { status: 403 })
  }

  const mapped = mapRepresentativeForDb(body, current)
  let updateQuery = supabase
    .from('company_representatives')
    .update({
      ...mapped,
      history: buildHistory(current, mapped),
    })
    .eq('id', id)
    .select(REPRESENTATIVE_DETAIL_SELECT)
  updateQuery = applyTenantQueryScope(updateQuery, 'company_representatives', tenantContext)
  const { data, error } = await updateQuery.single()

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'UPDATE_FAILED' }, { status: 500 })
  if (data?.person_id) await syncMasterContact(supabase, 'person', data.person_id, body)
  if (data?.organization_id) await syncMasterContact(supabase, 'organization', data.organization_id, body)
  if (Array.isArray(body.entity_bank_accounts)) {
    const kind = data?.person_id ? 'person' : data?.organization_id ? 'organization' : null
    const masterId = data?.person_id || data?.organization_id
    if (kind && masterId) await new EntityBankAccountsService(supabase as any).syncMany(kind, masterId, body.entity_bank_accounts, null)
  }
  const hydrated = data?.person_id
    ? await hydrateMasterContact(supabase, 'person', data)
    : data?.organization_id
      ? await hydrateMasterContact(supabase, 'organization', data)
      : data
  return NextResponse.json({ data: hydrated })
}

function normalizeAuthorityType(value: unknown) {
  return String(value || '').trim()
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'representatives.delete')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)

  let deleteQuery = supabase
    .from('company_representatives')
    .update({
      status: 'Pasif',
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: 'Sistem Kullanıcısı',
    })
    .eq('id', id)
  deleteQuery = applyTenantQueryScope(deleteQuery, 'company_representatives', tenantContext)
  const { error } = await deleteQuery

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'SOFT_DELETE_FAILED' }, { status: 500 })
  return NextResponse.json({ success: true })
}

function mapRepresentativeForDb(representative: Record<string, any>, current?: Record<string, any>) {
  const authorityTypes = representative.authority_types?.length
    ? representative.authority_types.map(normalizeAuthorityType)
    : [normalizeAuthorityType(representative.primary_authority_type || current?.authority_types?.[0])].filter(Boolean)

  return {
    company_id: representative.company_id || representative.company_id || current?.company_id || current?.company_id,    full_name: representative.display_name || buildDisplayName(representative, current) || current?.display_name || 'Temsilci',
    job_title: normalizeAuthorityType(representative.primary_authority_type || current?.job_title) || null,
    authority_type: 'other',
    authority_types: authorityTypes,
    person_kind: representative.person_or_entity_type || current?.person_kind || 'person',
    source_type: representative.source_type || current?.source_type,
    source_id: representative.source_id || current?.source_id,
    display_name: representative.display_name || buildDisplayName(representative, current) || current?.display_name,
    start_date: representative.start_date || current?.start_date,
    end_date: representative.end_date || null,
    status: representative.status || current?.status || 'Aktif',
    notes: representative.notes || null,
    signature_type: representative.signature_type || null,
    transaction_limit: representative.authority_limit || representative.transaction_limit || null,
    currency: representative.currency || current?.currency || 'TRY',
    requires_joint_signature: !!(representative.requires_joint_signature ?? current?.requires_joint_signature),
    can_approve_alone: !!(representative.can_approve_alone ?? current?.can_approve_alone),
    photo_logo: representative.photo_logo || current?.photo_logo || [],
    authority_documents: representative.authority_documents || current?.authority_documents || [],
    representative_profile: stripMasterDataForRoleProfile(representative),
    is_deleted: !!(representative.is_deleted ?? current?.is_deleted),
    deleted_at: 'deleted_at' in representative ? representative.deleted_at : current?.deleted_at ?? null,
    deleted_by: 'deleted_by' in representative ? representative.deleted_by : current?.deleted_by ?? null,
  }
}

function buildDisplayName(source: Record<string, any>, current?: Record<string, any>) {
  const kind = source.person_or_entity_type || current?.person_kind
  return kind === 'organization'
    ? source.trade_name || source.short_name || ''
    : [source.first_name ?? current?.first_name, source.last_name ?? current?.last_name].filter(Boolean).join(' ').trim()
}
