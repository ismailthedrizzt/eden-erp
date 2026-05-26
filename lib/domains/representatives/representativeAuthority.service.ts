import 'server-only'

import { applyTenantQueryScope, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { validateRepresentativeAuthorityScopePolicy } from '@/lib/security/policies/representativeAuthorityPolicies'
import { getBranchById } from '../branches/branch.service'
import { domainFailure, domainSuccess } from '../domainServiceResponse'
import type { DomainServiceContext, DomainServiceResult } from '../domainService.types'
import type { RepresentativeAuthorityScopeInput } from './representative.types'

export const REPRESENTATIVE_SELECT = 'id,company_id,person_id,organization_id,person_kind,source_type,source_id,display_name,full_name,authority_types,job_title,authority_type,status,record_status,start_date,end_date,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,requires_joint_signature,can_approve_alone,is_deleted,created_at,updated_at,version'
export const CURRENT_AUTHORITY_SELECT = 'representative_id,company_id,tenant_id,authority_status,authority_record_status,authority_status_label,authority_types,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,limits,scope,scope_type,branch_id,organization_unit_id,facility_id,scope_label,scope_notes,requires_joint_signature,can_approve_alone,effective_date,end_date,warnings,last_transaction_id,last_transaction_type,display_name,person_id,organization_id'
export const AUTHORITY_TRANSACTION_SELECT = 'id,company_id,representative_id,person_id,organization_id,transaction_no,transaction_type,transaction_status,authority_effect_status,authority_record_status,authority_types,signature_type,transaction_limit,payment_approval_limit,purchase_approval_limit,bank_transaction_limit,contract_signature_limit,currency,limits,scope,scope_type,branch_id,organization_unit_id,facility_id,scope_label,scope_notes,requires_joint_signature,can_approve_alone,document_files,effective_date,end_date,approval_status,workflow_status,notes,warnings,reversal_transaction_id,new_values,created_at,updated_at,version,is_deleted'

export async function getRepresentativeById(
  context: DomainServiceContext,
  representativeId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  let query = context.supabase
    .from('company_representatives')
    .select(REPRESENTATIVE_SELECT)
    .eq('id', representativeId)
    .eq('is_deleted', false)
  query = applyTenantQueryScope(query, 'company_representatives', context.tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) return normalizeRepresentativeError(error, 'REPRESENTATIVE_FETCH_FAILED')
  if (!data) return domainFailure('REPRESENTATIVE_NOT_FOUND', 'Temsilci kaydi bulunamadi.', 404)
  return domainSuccess(data as Record<string, any>)
}

export async function findRepresentativeByMasterForCompany(
  context: DomainServiceContext,
  companyId: string,
  personId?: string | null,
  organizationId?: string | null,
): Promise<DomainServiceResult<Record<string, any> | null>> {
  const masterColumn = personId ? 'person_id' : organizationId ? 'organization_id' : null
  const masterId = personId || organizationId || null
  if (!masterColumn || !masterId) return domainSuccess(null)

  let query = context.supabase
    .from('company_representatives')
    .select(REPRESENTATIVE_SELECT)
    .eq('company_id', companyId)
    .eq(masterColumn, masterId)
    .eq('is_deleted', false)
    .limit(1)
  query = applyTenantQueryScope(query, 'company_representatives', context.tenantContext)
  const { data, error } = await query
  if (error) return normalizeRepresentativeError(error, 'REPRESENTATIVE_MASTER_LOOKUP_FAILED')
  return domainSuccess(Array.isArray(data) ? data[0] || null : null)
}

export async function assertUniqueRepresentativeCard(
  context: DomainServiceContext,
  input: { companyId: string; personId?: string | null; organizationId?: string | null; excludeRepresentativeId?: string | null },
): Promise<DomainServiceResult<{ existing: Record<string, any> | null }>> {
  const result = await findRepresentativeByMasterForCompany(context, input.companyId, input.personId, input.organizationId)
  if (!result.ok) return result as DomainServiceResult<any>
  const existing = result.data
  if (existing && existing.id !== input.excludeRepresentativeId) {
    return domainFailure('REPRESENTATIVE_CARD_ALREADY_EXISTS', 'Ayni kisi/kurum icin bu sirket altinda temsilci karti zaten var.', 409, { representative_id: existing.id })
  }
  return domainSuccess({ existing: existing || null })
}

export async function validateAuthorityScope(
  context: DomainServiceContext,
  input: { companyId?: string | null; scope: RepresentativeAuthorityScopeInput },
): Promise<DomainServiceResult<null>> {
  const violation = await validateRepresentativeAuthorityScopePolicy({
    supabase: context.supabase,
    tenantContext: context.tenantContext,
    companyId: input.companyId,
    scope: input.scope,
  })
  if (violation) return domainFailure(violation.code, violation.error, violation.status, violation.details)
  return domainSuccess(null)
}

export async function createAuthorityTransaction(
  context: DomainServiceContext,
  representativeId: string,
  payload: Record<string, any>,
): Promise<DomainServiceResult<Record<string, any>>> {
  const representativeResult = await getRepresentativeById(context, representativeId)
  if (!representativeResult.ok) return representativeResult
  const representative = representativeResult.data as Record<string, any>
  const scope = normalizeAuthorityScope(payload)
  const scopeValidation = await validateAuthorityScope(context, { companyId: representative.company_id, scope })
  if (!scopeValidation.ok) return scopeValidation as DomainServiceResult<any>

  const now = new Date().toISOString()
  const row = withTenantInsertScopeForTable({
    ...payload,
    company_id: representative.company_id,
    representative_id: representativeId,
    person_id: representative.person_id || payload.person_id || null,
    organization_id: representative.organization_id || payload.organization_id || null,
    scope,
    scope_type: scope.scope_type,
    branch_id: scope.branch_id || null,
    organization_unit_id: scope.organization_unit_id || null,
    facility_id: scope.facility_id || null,
    scope_label: scope.scope_label || normalizeAuthorityScopeLabel(scope),
    scope_notes: scope.scope_notes || null,
    created_by: context.userId || null,
    updated_by: context.userId || null,
    created_at: payload.created_at || now,
    updated_at: now,
    version: Number(payload.version || 1),
    is_deleted: false,
  }, 'company_representative_authority_transactions', context.tenantContext)

  const { data, error } = await context.supabase
    .from('company_representative_authority_transactions')
    .insert(row)
    .select(AUTHORITY_TRANSACTION_SELECT)
    .single()
  if (error) return normalizeRepresentativeError(error, 'AUTHORITY_TRANSACTION_CREATE_FAILED')
  return domainSuccess(data as Record<string, any>)
}

export async function applyAuthorityTransactionFallback(
  context: DomainServiceContext,
  representativeId: string,
  payload: Record<string, any>,
) {
  return createAuthorityTransaction(context, representativeId, payload)
}

export async function getCurrentAuthority(
  context: DomainServiceContext,
  representativeId: string,
  options: { includeTransactions?: boolean } = {},
): Promise<DomainServiceResult<Record<string, any> | null>> {
  let query = context.supabase
    .from('v_current_representative_authorities')
    .select(CURRENT_AUTHORITY_SELECT)
    .eq('representative_id', representativeId)
  query = applyTenantQueryScope(query, 'v_current_representative_authorities', context.tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error && !isMissingInfrastructureError(error)) return normalizeRepresentativeError(error, 'CURRENT_AUTHORITY_FETCH_FAILED')

  if (data || !options.includeTransactions) return domainSuccess((data || null) as Record<string, any> | null)

  let transactionQuery = context.supabase
    .from('company_representative_authority_transactions')
    .select(AUTHORITY_TRANSACTION_SELECT)
    .eq('representative_id', representativeId)
    .eq('is_deleted', false)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
  transactionQuery = applyTenantQueryScope(transactionQuery, 'company_representative_authority_transactions', context.tenantContext)
  const { data: transactions, error: transactionError } = await transactionQuery
  if (transactionError) return normalizeRepresentativeError(transactionError, 'AUTHORITY_TRANSACTION_FALLBACK_FAILED', null)
  return domainSuccess(Array.isArray(transactions) ? transactions[0] || null : null)
}

export async function listRepresentativeAuthoritiesForBranch(
  context: DomainServiceContext,
  branchId: string,
  options: { includeCompanyWide?: boolean; includeInactive?: boolean } = {},
): Promise<DomainServiceResult<Record<string, any>[]>> {
  const branchResult = await getBranchById(context, branchId)
  if (!branchResult.ok) return branchResult as DomainServiceResult<any>
  const branch = branchResult.data as Record<string, any>
  let query = context.supabase
    .from('v_current_representative_authorities')
    .select(CURRENT_AUTHORITY_SELECT)
    .eq('company_id', branch.company_id)
  query = options.includeCompanyWide
    ? query.or(`branch_id.eq.${branchId},scope_type.eq.company_wide`)
    : query.eq('branch_id', branchId)
  if (!options.includeInactive) query = query.not('authority_status', 'in', '("suspended","terminated","closed","passive")')
  query = applyTenantQueryScope(query, 'v_current_representative_authorities', context.tenantContext)
  const { data, error } = await query
  if (error) return normalizeRepresentativeError(error, 'BRANCH_AUTHORITY_LIST_FAILED', [])
  return domainSuccess((data || []).map(normalizeRepresentativeAuthorityRow))
}

export async function listRepresentativeAuthoritiesForCompany(
  context: DomainServiceContext,
  companyId: string,
  options: { includeInactive?: boolean } = {},
): Promise<DomainServiceResult<Record<string, any>[]>> {
  let query = context.supabase
    .from('v_current_representative_authorities')
    .select(CURRENT_AUTHORITY_SELECT)
    .eq('company_id', companyId)
  if (!options.includeInactive) query = query.not('authority_status', 'in', '("suspended","terminated","closed","passive")')
  query = applyTenantQueryScope(query, 'v_current_representative_authorities', context.tenantContext)
  const { data, error } = await query
  if (error) return normalizeRepresentativeError(error, 'COMPANY_AUTHORITY_LIST_FAILED', [])
  return domainSuccess((data || []).map(normalizeRepresentativeAuthorityRow))
}

export function normalizeAuthorityScopeLabel(scope: RepresentativeAuthorityScopeInput | null | undefined) {
  const scopeType = String(scope?.scope_type || 'company_wide')
  if (scope?.scope_label) return scope.scope_label
  if (scopeType === 'branch') return 'Sube kapsamli yetki'
  if (scopeType === 'organization_unit') return 'Organizasyon birimi kapsamli yetki'
  if (scopeType === 'facility') return 'Tesis/Lokasyon kapsamli yetki'
  return 'Sirket geneli'
}

function normalizeRepresentativeError<T = never>(error: any, code: string, fallbackData?: T): DomainServiceResult<T> {
  if (isMissingInfrastructureError(error) && fallbackData !== undefined) {
    return domainSuccess(fallbackData, ['Temsilci yetki altyapisi hazir degil.'])
  }
  if (isMissingInfrastructureError(error)) {
    return domainFailure('REPRESENTATIVE_AUTHORITY_INFRASTRUCTURE_MISSING', 'Temsilci yetki altyapisi hazir degil.', 409, error)
  }
  return domainFailure(error?.code || code, error?.message || 'Temsilci yetki islemi tamamlanamadi.', 500, error)
}

function normalizeAuthorityScope(payload: Record<string, any>): RepresentativeAuthorityScopeInput {
  const explicitScope = payload.scope && typeof payload.scope === 'object' ? payload.scope : {}
  return {
    scope_type: payload.scope_type || explicitScope.scope_type || 'company_wide',
    branch_id: payload.branch_id || explicitScope.branch_id || null,
    organization_unit_id: payload.organization_unit_id || explicitScope.organization_unit_id || null,
    facility_id: payload.facility_id || explicitScope.facility_id || null,
    scope_label: payload.scope_label || explicitScope.scope_label || null,
    scope_notes: payload.scope_notes || explicitScope.scope_notes || null,
  }
}

function normalizeRepresentativeAuthorityRow(row: Record<string, any>) {
  const scope = normalizeAuthorityScope(row)
  return {
    ...row,
    scope,
    scope_type: scope.scope_type,
    branch_id: scope.branch_id,
    organization_unit_id: scope.organization_unit_id,
    facility_id: scope.facility_id,
    scope_label: scope.scope_label || normalizeAuthorityScopeLabel(scope),
    scope_notes: scope.scope_notes || '',
  }
}
