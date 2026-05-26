import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { COMPANY_BRANCH_SELECT } from '../route'

const emptyStringToUndefined = (value: unknown) => value === '' ? undefined : value
const optionalUuid = z.preprocess(emptyStringToUndefined, z.string().uuid().optional().nullable())
const BranchCardUpdateSchema = z.object({
  branch_short_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.union([z.literal(''), z.string().email()]).optional().nullable(),
  responsible_person_id: optionalUuid,
  organization_unit_id: optionalUuid,
  facility_id: optionalUuid,
  notes: z.string().optional().nullable(),
})
const OFFICIAL_BRANCH_FIELDS = new Set([
  'company_id',
  'branch_name',
  'branch_type',
  'is_official_branch',
  'country',
  'city',
  'district',
  'neighborhood',
  'address',
  'postal_code',
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
  'status',
  'record_status',
  'start_date',
  'end_date',
  'document_files',
])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'companies.view')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const branch = await loadBranch(supabase, id, tenantContext)
  if (!branch) return NextResponse.json({ error: 'Şube kaydı bulunamadı.', code: 'BRANCH_NOT_FOUND' }, { status: 404 })
  const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, branch.company_id)
  if (!companyScope) return NextResponse.json({ error: 'Şube bağlı şirket scope dışında.', code: 'COMPANY_SCOPE_NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ data: await hydrateBranch(supabase, branch, tenantContext) })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'companies.edit')
  if (permission instanceof NextResponse) return permission
  const tenantContext = resolveTenantContext(request)
  const rawBody = await request.json().catch(() => ({}))
  const forbiddenFields = Object.keys(rawBody).filter(key => OFFICIAL_BRANCH_FIELDS.has(key))
  if (forbiddenFields.length) {
    return NextResponse.json({
      error: 'Resmi şube alanları normal kart güncellemesiyle değiştirilemez. Şube resmi işlem wizardını kullanın.',
      code: 'BRANCH_OFFICIAL_FIELDS_LOCKED',
      details: { fields: forbiddenFields },
      message: 'İşlem tamamlanamadı',
    }, { status: 409 })
  }
  const current = await loadBranch(supabase, id, tenantContext)
  if (!current) return NextResponse.json({ error: 'Şube kaydı bulunamadı.', code: 'BRANCH_NOT_FOUND' }, { status: 404 })
  const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, current.company_id)
  if (!companyScope) return NextResponse.json({ error: 'Şube bağlı şirket scope dışında.', code: 'COMPANY_SCOPE_NOT_FOUND' }, { status: 404 })
  if (!isWritableCompanyScope(companyScope)) return NextResponse.json({ error: 'Bu şirketin şubeleri için yalnızca görüntüleme yetkiniz var.', code: 'COMPANY_SCOPE_READONLY' }, { status: 403 })
  const parsed = BranchCardUpdateSchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ error: 'Şube kart güncelleme verileri geçerli değil.', code: 'VALIDATION_FAILED', details: { validation: parsed.error.flatten() }, message: 'İşlem tamamlanamadı' }, { status: 400 })
  const patch = normalizePatch(parsed.data)
  const changedFields = Object.keys(patch).filter(field => String(patch[field] ?? '') !== String(current[field] ?? ''))
  if (!changedFields.length) return NextResponse.json({ data: await hydrateBranch(supabase, current, tenantContext) })
  let updateQuery = supabase.from('company_branches').update({ ...patch, updated_at: new Date().toISOString(), updated_by: permission.userId || null, version: Number(current.version || 1) + 1 }).eq('id', id)
  updateQuery = applyTenantQueryScope(updateQuery, 'company_branches', tenantContext)
  const { data, error } = await updateQuery.select(COMPANY_BRANCH_SELECT).single()
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'BRANCH_CARD_UPDATE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: await hydrateBranch(supabase, data as Record<string, any>, tenantContext) })
}

export async function DELETE() {
  return NextResponse.json({
    error: 'Şube hard delete ile silinemez. Kapatma için Şube Kapanışı resmi işlem wizardını kullanın.',
    code: 'USE_BRANCH_CLOSING_WIZARD',
    message: 'İşlem tamamlanamadı',
  }, { status: 409 })
}

async function loadBranch(
  supabase: ReturnType<typeof createServiceClient>,
  id: string,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  let query = supabase.from('company_branches').select(COMPANY_BRANCH_SELECT).eq('id', id).eq('is_deleted', false)
  query = applyTenantQueryScope(query, 'company_branches', tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) {
    if (isMissingInfrastructureError(error)) return null
    throw error
  }
  return data as Record<string, any> | null
}

async function hydrateBranch(
  supabase: ReturnType<typeof createServiceClient>,
  branch: Record<string, any>,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  const [company, organizationUnit] = await Promise.all([
    loadRef(supabase, 'companies', 'id,trade_name,short_name', branch.company_id, tenantContext),
    branch.organization_unit_id ? loadRef(supabase, 'organization_units', 'id,name,short_name,type,status', branch.organization_unit_id, tenantContext) : null,
  ])
  return {
    ...branch,
    company,
    company_name: company?.trade_name || company?.short_name || '',
    organization_unit: organizationUnit,
    organization_unit_name: organizationUnit?.name || '',
    facility_name: branch.metadata_json?.facility_name || '',
    address_summary: [branch.district, branch.city].filter(Boolean).join(', '),
  }
}

async function loadRef(
  supabase: ReturnType<typeof createServiceClient>,
  tableName: 'companies' | 'organization_units',
  select: string,
  id: string,
  tenantContext: ReturnType<typeof resolveTenantContext>
) {
  let query = supabase.from(tableName).select(select).eq('id', id)
  query = applyTenantQueryScope(query, tableName, tenantContext)
  const { data } = await query.maybeSingle()
  return data as Record<string, any> | null
}

function normalizePatch(input: z.infer<typeof BranchCardUpdateSchema>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined).map(([key, value]) => [key, value === '' ? null : value]))
}
