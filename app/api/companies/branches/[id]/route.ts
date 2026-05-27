// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: branches
// TARGET_FASTAPI_ENDPOINT: /api/v1/branches/{branch_id}
// NOTES: Branch card read/update should become a FastAPI proxy; official fields stay operation-controlled.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, resolveTenantContext } from '@/lib/tenancy/server'
import { getTenantCompanyScope, isWritableCompanyScope } from '@/lib/tenancy/companyScopes'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { COMPANY_BRANCH_SELECT } from '@/lib/modules/companies/companyBranchSelect'
import { resolveBaseUpdatedAt, resolveBaseVersion } from '@/lib/operations/idempotency'
import { requireBranchPolicy } from '@/lib/security/policies/branchPolicies'
import { fieldControlViolationResponse, getOperationControlledPatchViolation } from '@/lib/field-controls/fieldControlGuards'
import { getBranchById, updateBranchCard } from '@/lib/domains/branches/branch.service'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const fastApiResponse = await proxyToFastApi(request, `/api/v1/branches/${id}`)
  if (fastApiResponse) return fastApiResponse

  const supabase = createServiceClient()
  const policy = await requireBranchPolicy({ request, supabase, actionKey: 'branch.view', branchId: id })
  if (policy instanceof Response) return policy
  const tenantContext = resolveTenantContext(request)
  const branch = (await getBranchById({ supabase, tenantContext }, id)).data as Record<string, any> | undefined
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
  const policy = await requireBranchPolicy({ request, supabase, actionKey: 'branch.edit', branchId: id })
  if (policy instanceof Response) return policy
  const tenantContext = resolveTenantContext(request)
  const rawBody = await request.json().catch(() => ({}))
  const baseVersion = resolveBaseVersion(rawBody)
  const baseUpdatedAt = resolveBaseUpdatedAt(rawBody)
  const current = (await getBranchById({ supabase, tenantContext }, id)).data as Record<string, any> | undefined
  if (!current) return NextResponse.json({ error: 'Şube kaydı bulunamadı.', code: 'BRANCH_NOT_FOUND' }, { status: 404 })
  const operationViolation = getOperationControlledPatchViolation('company_branch', rawBody, current)
  if (operationViolation) return fieldControlViolationResponse(operationViolation)
  const companyScope = await getTenantCompanyScope(supabase, tenantContext.tenantId, current.company_id)
  if (!companyScope) return NextResponse.json({ error: 'Şube bağlı şirket scope dışında.', code: 'COMPANY_SCOPE_NOT_FOUND' }, { status: 404 })
  if (!isWritableCompanyScope(companyScope)) return NextResponse.json({ error: 'Bu şirketin şubeleri için yalnızca görüntüleme yetkiniz var.', code: 'COMPANY_SCOPE_READONLY' }, { status: 403 })
  const conflictDetails = {
    current_version: current.version,
    base_version: baseVersion,
    current_updated_at: current.updated_at,
    base_updated_at: baseUpdatedAt,
  }
  if (baseVersion !== null && Number(current.version || 0) !== Number(baseVersion)) {
    return NextResponse.json({
      error: 'Şube kaydı bu işlem hazırlanırken değişmiş. Lütfen kaydı yenileyip tekrar deneyin.',
      code: 'VERSION_CONFLICT',
      details: conflictDetails,
      message: 'İşlem tamamlanamadı',
    }, { status: 409 })
  }
  if (baseUpdatedAt && current.updated_at && new Date(current.updated_at).getTime() !== new Date(baseUpdatedAt).getTime()) {
    return NextResponse.json({
      error: 'Şube kaydı bu işlem hazırlanırken değişmiş. Lütfen kaydı yenileyip tekrar deneyin.',
      code: 'VERSION_CONFLICT',
      details: conflictDetails,
      message: 'İşlem tamamlanamadı',
    }, { status: 409 })
  }
  const parsed = BranchCardUpdateSchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ error: 'Şube kart güncelleme verileri geçerli değil.', code: 'VALIDATION_FAILED', details: { validation: parsed.error.flatten() }, message: 'İşlem tamamlanamadı' }, { status: 400 })
  const patch = normalizePatch(parsed.data)
  const updateResult = await updateBranchCard({ supabase, tenantContext, userId: policy.context.userId || null }, id, { ...patch, baseVersion, baseUpdatedAt })
  if (!updateResult.ok) return NextResponse.json({ error: updateResult.error, code: updateResult.code, details: updateResult.details, message: 'Islem tamamlanamadi' }, { status: updateResult.status || 500 })
  return NextResponse.json({ data: await hydrateBranch(supabase, updateResult.data?.branch || current, tenantContext) })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const policy = await requireBranchPolicy({ request, supabase, actionKey: 'branch.edit', branchId: id })
  if (policy instanceof Response) return policy

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
  const [company, organizationUnit, facility] = await Promise.all([
    loadRef(supabase, 'companies', 'id,trade_name,short_name', branch.company_id, tenantContext),
    branch.organization_unit_id ? loadRef(supabase, 'organization_units', 'id,name,short_name,type,status', branch.organization_unit_id, tenantContext) : null,
    branch.facility_id ? loadRef(supabase, 'company_facilities', 'id,facility_name,status,record_status', branch.facility_id, tenantContext) : null,
  ])
  return {
    ...branch,
    company,
    company_name: company?.trade_name || company?.short_name || '',
    organization_unit: organizationUnit,
    organization_unit_name: organizationUnit?.name || '',
    facility,
    facility_name: facility?.facility_name || branch.metadata_json?.facility_name || '',
    address_summary: [branch.district, branch.city].filter(Boolean).join(', '),
  }
}

async function loadRef(
  supabase: ReturnType<typeof createServiceClient>,
  tableName: 'companies' | 'organization_units' | 'company_facilities',
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
