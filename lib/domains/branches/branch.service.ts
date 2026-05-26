import 'server-only'

import { COMPANY_BRANCH_SELECT } from '@/lib/modules/companies/companyBranchSelect'
import { applyTenantQueryScope, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { domainFailure, domainSuccess } from '../domainServiceResponse'
import type { DomainServiceContext, DomainServiceResult } from '../domainService.types'
import type { BranchCardPatch, BranchClosePayload, BranchCreatePayload, BranchListQuery } from './branch.types'

export type BranchSummary = {
  total_branch_count: number
  active_branch_count: number
  official_branch_count: number
  operation_point_count: number
  closed_branch_count: number
  last_opened_branch: Record<string, any> | null
  last_closed_branch: Record<string, any> | null
}

export async function getBranchById(
  context: DomainServiceContext,
  branchId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  let query = context.supabase
    .from('company_branches')
    .select(COMPANY_BRANCH_SELECT)
    .eq('id', branchId)
    .eq('is_deleted', false)
  query = applyTenantQueryScope(query, 'company_branches', context.tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) return normalizeBranchError(error, 'BRANCH_FETCH_FAILED')
  if (!data) return domainFailure('BRANCH_NOT_FOUND', 'Sube kaydi bulunamadi.', 404)
  return domainSuccess(data as Record<string, any>)
}

export async function listBranches(
  context: DomainServiceContext,
  queryInput: BranchListQuery = {},
): Promise<DomainServiceResult<Record<string, any>[]>> {
  let query = context.supabase
    .from('company_branches')
    .select(COMPANY_BRANCH_SELECT)
    .order('branch_name', { ascending: true })

  if (queryInput.companyId) query = query.eq('company_id', queryInput.companyId)
  if (queryInput.status) query = query.eq('status', queryInput.status)
  if (queryInput.branchType) query = query.eq('branch_type', queryInput.branchType)
  if (!queryInput.includeDeleted) query = query.eq('is_deleted', false)
  if (queryInput.limit) query = query.limit(queryInput.limit)

  query = applyTenantQueryScope(query, 'company_branches', context.tenantContext)
  const { data, error } = await query
  if (error) return normalizeBranchError(error, 'BRANCH_LIST_FAILED', [])
  return domainSuccess((data || []) as Record<string, any>[])
}

export async function getBranchesForCompany(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>[]>> {
  return listBranches(context, { companyId })
}

export async function createBranch(
  context: DomainServiceContext,
  payload: BranchCreatePayload,
): Promise<DomainServiceResult<{ branch: Record<string, any>; changedFields: string[] }>> {
  const branchName = normalizeRequiredString(payload.branch_name)
  if (!payload.company_id) return domainFailure('COMPANY_REQUIRED', 'Sube icin bagli sirket zorunludur.', 400)
  if (!branchName) return domainFailure('BRANCH_NAME_REQUIRED', 'Sube adi zorunludur.', 400)

  const now = new Date().toISOString()
  const row = withTenantInsertScopeForTable({
    company_id: payload.company_id,
    organization_unit_id: payload.organization_unit_id || null,
    facility_id: payload.facility_id || null,
    branch_name: branchName,
    branch_short_name: normalizeOptionalString(payload.branch_short_name),
    branch_type: payload.branch_type || 'official_branch',
    is_official_branch: payload.is_official_branch ?? true,
    country: normalizeOptionalString(payload.country) || 'Turkiye',
    city: normalizeOptionalString(payload.city),
    district: normalizeOptionalString(payload.district),
    neighborhood: normalizeOptionalString(payload.neighborhood),
    address: normalizeOptionalString(payload.address),
    postal_code: normalizeOptionalString(payload.postal_code),
    phone: normalizeOptionalString(payload.phone),
    email: normalizeOptionalString(payload.email),
    trade_registry_number: normalizeOptionalString(payload.trade_registry_number),
    trade_registry_office: normalizeOptionalString(payload.trade_registry_office),
    tax_office: normalizeOptionalString(payload.tax_office),
    sgk_workplace_registry_no: normalizeOptionalString(payload.sgk_workplace_registry_no),
    opening_decision_date: emptyToNull(payload.opening_decision_date),
    opening_registration_date: emptyToNull(payload.opening_registration_date),
    closing_decision_date: emptyToNull(payload.closing_decision_date),
    closing_registration_date: emptyToNull(payload.closing_registration_date),
    trade_registry_gazette_date: emptyToNull(payload.trade_registry_gazette_date),
    trade_registry_gazette_number: normalizeOptionalString(payload.trade_registry_gazette_number),
    responsible_person_id: payload.responsible_person_id || null,
    status: 'active',
    record_status: 'active',
    start_date: emptyToNull(payload.start_date || payload.opening_registration_date || payload.opening_decision_date),
    notes: normalizeOptionalString(payload.notes),
    document_files: payload.document_files || [],
    metadata_json: payload.metadata_json || {},
    created_by: context.userId || null,
    updated_by: context.userId || null,
    created_at: now,
    updated_at: now,
    version: 1,
    is_deleted: false,
  }, 'company_branches', context.tenantContext)

  const { data, error } = await context.supabase
    .from('company_branches')
    .insert(row)
    .select(COMPANY_BRANCH_SELECT)
    .single()
  if (error) return normalizeBranchError(error, 'BRANCH_CREATE_FAILED')

  const changedFields = Object.keys(row).filter(field =>
    !['tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'version', 'is_deleted'].includes(field)
  )
  return domainSuccess({ branch: data as Record<string, any>, changedFields })
}

export async function closeBranch(
  context: DomainServiceContext,
  branchId: string,
  payload: BranchClosePayload,
): Promise<DomainServiceResult<{
  branch: Record<string, any>
  previousBranch: Record<string, any>
  changedFields: string[]
  oldValues: Record<string, any>
  newValues: Record<string, any>
}>> {
  const currentResult = await getBranchById(context, branchId)
  if (!currentResult.ok) return currentResult as DomainServiceResult<any>
  const current = currentResult.data as Record<string, any>
  const conflict = detectBranchConflict(current, payload.baseVersion, payload.baseUpdatedAt)
  if (conflict) return conflict

  const previousDocumentFiles = Array.isArray(current.document_files) ? current.document_files : []
  const closingDocuments = (payload.document_files || []).map(document => ({ ...document, closing_document: true }))
  const now = new Date().toISOString()
  const updatePayload = {
    status: 'closed',
    record_status: 'closed',
    closing_decision_date: emptyToNull(payload.closing_decision_date),
    closing_registration_date: emptyToNull(payload.closing_registration_date),
    trade_registry_gazette_date: emptyToNull(payload.trade_registry_gazette_date),
    trade_registry_gazette_number: normalizeOptionalString(payload.trade_registry_gazette_number),
    end_date: emptyToNull(payload.closing_registration_date || payload.closing_decision_date),
    document_files: [...previousDocumentFiles, ...closingDocuments],
    metadata_json: {
      ...(current.metadata_json || {}),
      closing_reason: payload.closing_reason || null,
      sgk_closing_notification: !!payload.sgk_closing_notification,
      tax_office_notification: !!payload.tax_office_notification,
      organization_unit_action: payload.organization_unit_action || null,
      target_organization_unit_id: payload.target_organization_unit_id || null,
      facility_action: payload.facility_action || null,
      closed_operation_id: context.operationId || null,
    },
    notes: normalizeOptionalString(payload.notes) || current.notes || null,
    updated_by: context.userId || null,
    updated_at: now,
    version: Number(current.version || 1) + 1,
  }

  let query = context.supabase
    .from('company_branches')
    .update(updatePayload)
    .eq('id', branchId)
  query = applyTenantQueryScope(query, 'company_branches', context.tenantContext)
  const { data, error } = await query.select(COMPANY_BRANCH_SELECT).single()
  if (error) return normalizeBranchError(error, 'BRANCH_CLOSE_FAILED')

  const changedFields = Object.keys(updatePayload)
  const updated = data as Record<string, any>
  const oldValues = Object.fromEntries(changedFields.map(field => [field, current[field] ?? null]))
  const newValues = Object.fromEntries(changedFields.map(field => [field, updated[field] ?? null]))
  return domainSuccess({ branch: updated, previousBranch: current, changedFields, oldValues, newValues })
}

export async function updateBranchCard(
  context: DomainServiceContext,
  branchId: string,
  payload: BranchCardPatch,
): Promise<DomainServiceResult<{ branch: Record<string, any>; previousBranch: Record<string, any>; changedFields: string[] }>> {
  const currentResult = await getBranchById(context, branchId)
  if (!currentResult.ok) return currentResult as DomainServiceResult<any>
  const current = currentResult.data as Record<string, any>
  const conflict = detectBranchConflict(current, payload.baseVersion, payload.baseUpdatedAt)
  if (conflict) return conflict

  const patch = normalizePatch(payload, ['branch_short_name', 'phone', 'email', 'responsible_person_id', 'organization_unit_id', 'facility_id', 'notes'])
  const changedFields = Object.keys(patch).filter(field => !sameValue(patch[field], current[field]))
  if (!changedFields.length) return domainSuccess({ branch: current, previousBranch: current, changedFields })

  const cleanPatch = Object.fromEntries(changedFields.map(field => [field, patch[field]]))
  let query = context.supabase
    .from('company_branches')
    .update({
      ...cleanPatch,
      updated_at: new Date().toISOString(),
      updated_by: context.userId || null,
      version: Number(current.version || 1) + 1,
    })
    .eq('id', branchId)
  query = applyTenantQueryScope(query, 'company_branches', context.tenantContext)
  const { data, error } = await query.select(COMPANY_BRANCH_SELECT).single()
  if (error) return normalizeBranchError(error, 'BRANCH_CARD_UPDATE_FAILED')
  return domainSuccess({ branch: data as Record<string, any>, previousBranch: current, changedFields })
}

export async function getBranchSummaryForCompany(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<BranchSummary>> {
  const result = await getBranchesForCompany(context, companyId)
  if (!result.ok) return result as DomainServiceResult<any>
  const branches = result.data || []
  const activeBranches = branches.filter(isActiveBranch)
  const closedBranches = branches.filter(isClosedBranch)
  return domainSuccess({
    total_branch_count: branches.length,
    active_branch_count: activeBranches.length,
    official_branch_count: activeBranches.filter(branch => branch.is_official_branch === true || branch.branch_type === 'official_branch').length,
    operation_point_count: activeBranches.filter(branch => branch.branch_type === 'operation_point').length,
    closed_branch_count: closedBranches.length,
    last_opened_branch: latestByDate(activeBranches, 'opening_registration_date', 'created_at'),
    last_closed_branch: latestByDate(closedBranches, 'closing_registration_date', 'updated_at'),
  })
}

export async function assertBranchBelongsToCompany(
  context: DomainServiceContext,
  branchId: string,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  const result = await getBranchById(context, branchId)
  if (!result.ok) return result
  const branch = result.data as Record<string, any>
  if (branch.company_id !== companyId) {
    return domainFailure('BRANCH_COMPANY_MISMATCH', 'Secilen sube bu sirkete bagli degil.', 409)
  }
  return domainSuccess(branch)
}

export async function assertBranchActive(
  context: DomainServiceContext,
  branchId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  const result = await getBranchById(context, branchId)
  if (!result.ok) return result
  const branch = result.data as Record<string, any>
  if (!isActiveBranch(branch)) return domainFailure('BRANCH_NOT_ACTIVE', 'Kapali veya pasif sube icin bu islem yapilamaz.', 409)
  return domainSuccess(branch)
}

export function buildBranchDisplayLabel(branch: Record<string, any> | null | undefined) {
  if (!branch) return ''
  return branch.branch_name || branch.branch_short_name || branch.trade_registry_number || branch.id || ''
}

export async function getBranchRepresentativeSummary(
  context: DomainServiceContext,
  branchId: string,
): Promise<DomainServiceResult<{ branchScoped: Record<string, any>[]; companyWide: Record<string, any>[] }>> {
  const branchResult = await getBranchById(context, branchId)
  if (!branchResult.ok) return branchResult as DomainServiceResult<any>
  const branch = branchResult.data as Record<string, any>

  let query = context.supabase
    .from('v_current_representative_authorities')
    .select('*')
    .eq('company_id', branch.company_id)
    .or(`branch_id.eq.${branchId},scope_type.eq.company_wide`)
  query = applyTenantQueryScope(query, 'v_current_representative_authorities', context.tenantContext)
  const { data, error } = await query
  if (error) {
    if (isMissingInfrastructureError(error)) return domainSuccess({ branchScoped: [], companyWide: [] }, ['Temsilci yetki ozet gorunumu hazir degil.'])
    return normalizeBranchError(error, 'BRANCH_REPRESENTATIVE_SUMMARY_FAILED')
  }

  const rows = (data || []) as Record<string, any>[]
  return domainSuccess({
    branchScoped: rows.filter(row => row.branch_id === branchId || row.scope?.branch_id === branchId),
    companyWide: rows.filter(row => (row.scope_type || row.scope?.scope_type || 'company_wide') === 'company_wide'),
  })
}

export function isActiveBranch(branch: Record<string, any>) {
  const values = [branch.record_status, branch.status]
    .map(value => normalizeStatus(value))
    .filter(Boolean)
  return branch.is_deleted !== true && values.some(value => value === 'active')
}

export class BranchDomainService {
  readonly domainKey = 'branches'

  describeBoundary(context: Pick<DomainServiceContext, 'tenantContext'>) {
    return {
      domainKey: this.domainKey,
      tenantId: context.tenantContext.tenantId,
      owns: ['company_branches'],
      rule: 'Branch is a company sub-unit; it is not a company, facility or organization unit.',
    }
  }
}

function normalizeBranchError<T = never>(error: any, code: string, fallbackData?: T): DomainServiceResult<T> {
  if (isMissingInfrastructureError(error) && fallbackData !== undefined) {
    return domainSuccess(fallbackData, ['Subeler modulu altyapisi hazir degil.'])
  }
  if (isMissingInfrastructureError(error)) {
    return domainFailure('BRANCH_INFRASTRUCTURE_MISSING', 'Subeler modulu altyapisi hazir degil.', 409, error)
  }
  return domainFailure(error?.code || code, error?.message || 'Sube islemi tamamlanamadi.', 500, error)
}

function detectBranchConflict(
  branch: Record<string, any>,
  baseVersion?: number | null,
  baseUpdatedAt?: string | null,
): DomainServiceResult<any> | null {
  const details = {
    current_version: branch.version,
    base_version: baseVersion ?? null,
    current_updated_at: branch.updated_at ?? null,
    base_updated_at: baseUpdatedAt ?? null,
  }
  if (baseVersion !== null && baseVersion !== undefined && Number(branch.version || 0) !== Number(baseVersion)) {
    return domainFailure('VERSION_CONFLICT', 'Sube kaydi bu islem hazirlanirken degismis. Lutfen kaydi yenileyip tekrar deneyin.', 409, details)
  }
  if (baseUpdatedAt && branch.updated_at && new Date(branch.updated_at).getTime() !== new Date(baseUpdatedAt).getTime()) {
    return domainFailure('VERSION_CONFLICT', 'Sube kaydi bu islem hazirlanirken degismis. Lutfen kaydi yenileyip tekrar deneyin.', 409, details)
  }
  return null
}

function normalizePatch(input: Record<string, any>, fields: string[]) {
  return Object.fromEntries(fields
    .filter(field => input[field] !== undefined)
    .map(field => [field, input[field] === '' ? null : input[field]]))
}

function emptyToNull(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  return value
}

function normalizeOptionalString(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : value
  return text === '' || text === undefined ? null : text
}

function normalizeRequiredString(value: unknown) {
  return String(value || '').trim()
}

function normalizeStatus(value: unknown) {
  const normalized = String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (['aktif', 'active'].includes(normalized)) return 'active'
  if (['taslak', 'draft'].includes(normalized)) return 'draft'
  if (['pasif', 'passive', 'inactive'].includes(normalized)) return 'passive'
  if (['kapali', 'closed'].includes(normalized)) return 'closed'
  if (['terkin', 'deregistered'].includes(normalized)) return 'deregistered'
  return normalized
}

function isClosedBranch(branch: Record<string, any>) {
  const values = [branch.record_status, branch.status].map(value => normalizeStatus(value))
  return values.some(value => ['closed', 'passive', 'deregistered'].includes(value))
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(normalizeComparableValue(left)) === JSON.stringify(normalizeComparableValue(right))
}

function normalizeComparableValue(value: unknown) {
  if (value === undefined || value === '') return null
  if (typeof value === 'string') return value.trim()
  return value
}

function latestByDate(rows: Record<string, any>[], primaryDateField: string, fallbackDateField: string) {
  return [...rows].sort((left, right) =>
    dateTime(right[primaryDateField] || right[fallbackDateField]) - dateTime(left[primaryDateField] || left[fallbackDateField])
  )[0] || null
}

function dateTime(value: unknown) {
  if (!value) return 0
  const time = new Date(String(value)).getTime()
  return Number.isFinite(time) ? time : 0
}
