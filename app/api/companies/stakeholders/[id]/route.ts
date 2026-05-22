import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { hydrateMasterContact, stripMasterDataForRoleProfile, syncMasterContact } from '@/lib/identity/masterContact'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import { ensureUniqueRoleMaster, roleUniquenessResponse } from '@/lib/identity/roleUniqueness'
import { requirePermission } from '@/lib/security/serverPermissions'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'

const STAKEHOLDER_DETAIL_SELECT = 'id,company_id,person_id,organization_id,stakeholder_type,category,display_name,tax_id,phone,email,country,city,status,priority_level,internal_owner_employee_id,relationship_start_date,relationship_end_date,iban,bank_name,currency,contract_status,notes,photo_logo,stakeholder_documents,stakeholder_profile,history,is_deleted,created_at'

const TRACKED_FIELDS = new Set(['category', 'status', 'phone', 'email', 'internal_owner_employee_id', 'relationship_start_date'])

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
  const permission = await requirePermission(request, supabase, 'stakeholders.view')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  let query = supabase.from('stakeholders').select(STAKEHOLDER_DETAIL_SELECT).eq('id', id)
  query = applyTenantQueryScope(query, 'stakeholders', tenantContext)
  const { data, error } = await query.single()
  if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Paydaş bulunamadı', code: 'STAKEHOLDER_NOT_FOUND' }, { status: 404 })
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
  const permission = await requirePermission(request, supabase, 'stakeholders.edit')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const body = await request.json()
  let currentQuery = supabase.from('stakeholders').select(STAKEHOLDER_DETAIL_SELECT).eq('id', id)
  currentQuery = applyTenantQueryScope(currentQuery, 'stakeholders', tenantContext)
  const { data: current, error: currentError } = await currentQuery.single()
  if (currentError?.code === 'PGRST116') return NextResponse.json({ error: 'Paydaş bulunamadı', code: 'STAKEHOLDER_NOT_FOUND' }, { status: 404 })
  if (currentError) return NextResponse.json({ error: currentError.message, code: currentError.code || 'FETCH_FAILED' }, { status: 500 })
  if (current.company_id) {
    const scope = await getTenantCompanyScope(supabase, tenantContext.tenantId, current.company_id)
    if (!scope) return NextResponse.json({ error: 'Şirket bulunamadı', code: 'COMPANY_NOT_FOUND' }, { status: 404 })
    if (!isWritableCompanyScope(scope)) return NextResponse.json({ error: 'Bu şirket için yalnızca görüntüleme yetkiniz var.', code: 'COMPANY_SCOPE_READONLY' }, { status: 403 })
  }

  const mapped = mapStakeholderForDb(body, current)
  const uniqueness = await ensureUniqueRoleMaster(supabase as any, {
    tableName: 'stakeholders',
    identity: {
      person_id: body.person_id || current.person_id,
      organization_id: body.organization_id || current.organization_id,
    },
    excludeId: id,
    tenantContext,
  })
  if (!uniqueness.ok) return roleUniquenessResponse(uniqueness)

  let updateQuery = supabase
    .from('stakeholders')
    .update({ ...mapped, history: buildHistory(current, mapped) })
    .eq('id', id)
    .select(STAKEHOLDER_DETAIL_SELECT)
  updateQuery = applyTenantQueryScope(updateQuery, 'stakeholders', tenantContext)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'stakeholders.delete')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  let deleteQuery = supabase
    .from('stakeholders')
    .update({ status: 'Pasif', is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'Sistem Kullanıcısı' })
    .eq('id', id)

  deleteQuery = applyTenantQueryScope(deleteQuery, 'stakeholders', tenantContext)
  const { error } = await deleteQuery

  if (error) return NextResponse.json({ error: error.message, code: error.code || 'SOFT_DELETE_FAILED' }, { status: 500 })
  return NextResponse.json({ success: true })
}

function mapStakeholderForDb(stakeholder: Record<string, any>, current?: Record<string, any>) {
  return {
    company_id: stakeholder.company_id || current?.company_id || null,
    stakeholder_type: stakeholder.stakeholder_type || current?.stakeholder_type || 'person',
    category: stakeholder.category || current?.category,
    display_name: stakeholder.display_name || buildDisplayName(stakeholder, current) || current?.display_name,
    tax_id: stakeholder.tax_id || null,
    phone: stakeholder.phone || stakeholder.phone_1 || null,
    email: stakeholder.email || stakeholder.email_1 || null,
    country: stakeholder.country || null,
    city: stakeholder.city || null,
    status: stakeholder.status || current?.status || 'Aktif',
    priority_level: stakeholder.priority_level || null,
    internal_owner_employee_id: stakeholder.internal_owner_employee_id || null,
    relationship_start_date: stakeholder.relationship_start_date || current?.relationship_start_date,
    relationship_end_date: stakeholder.relationship_end_date || null,
    iban: stakeholder.iban || null,
    bank_name: stakeholder.bank_name || null,
    currency: stakeholder.currency || current?.currency || 'TRY',
    contract_status: stakeholder.contract_status || null,
    notes: stakeholder.notes || null,
    photo_logo: stakeholder.photo_logo || current?.photo_logo || [],
    stakeholder_documents: stakeholder.stakeholder_documents || current?.stakeholder_documents || [],
    stakeholder_profile: stripMasterDataForRoleProfile(stakeholder),
    is_deleted: !!(stakeholder.is_deleted ?? current?.is_deleted),
    deleted_at: 'deleted_at' in stakeholder ? stakeholder.deleted_at : current?.deleted_at ?? null,
    deleted_by: 'deleted_by' in stakeholder ? stakeholder.deleted_by : current?.deleted_by ?? null,
  }
}

function buildDisplayName(source: Record<string, any>, current?: Record<string, any>) {
  const kind = source.stakeholder_type || current?.stakeholder_type
  return kind === 'organization'
    ? source.trade_name || source.legal_name || source.trade_name || source.short_name || source.short_name || current?.display_name || ''
    : [source.first_name ?? current?.first_name, source.last_name ?? current?.last_name].filter(Boolean).join(' ').trim() || source.full_name || current?.display_name || ''
}
