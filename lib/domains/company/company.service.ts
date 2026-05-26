import 'server-only'

import { buildFieldHistory } from '@/lib/crud/safeCrudService'
import { applyTenantQueryScope } from '@/lib/tenancy/server'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { domainFailure, domainSuccess } from '../domainServiceResponse'
import type { DomainServiceContext, DomainServiceResult } from '../domainService.types'
import type { CompanyLifecycleStatus } from './company.types'

export const COMPANY_DOMAIN_SELECT = 'id,organization_id,field_history,short_name,trade_name,tax_number,tax_office,company_type,country,city,district,address,postal_code,phone,email,is_deleted,record_status,company_status,mersis_number,trade_registry_number,foundation_date,legal_entity,electronic_notification_address,trade_registry_office,company_code,e_invoice_taxpayer,e_archive_taxpayer,e_waybill_taxpayer,sgk_workplace_registry_no,sgk_province,sgk_branch,nace_codes,risk_class,activity_subject,committed_capital_amount,paid_capital_amount,updated_at,version'

export async function getCompanyById(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  let query = context.supabase
    .from('companies')
    .select(COMPANY_DOMAIN_SELECT)
    .eq('id', companyId)
  query = applyTenantQueryScope(query, 'companies', context.tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) return normalizeCompanyError(error, 'COMPANY_FETCH_FAILED')
  if (!data) return domainFailure('COMPANY_NOT_FOUND', 'Sirket bulunamadi.', 404)
  return domainSuccess(data as Record<string, any>)
}

export async function assertCompanyActive(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  const result = await getCompanyById(context, companyId)
  if (!result.ok) return result
  const company = result.data as Record<string, any>
  const lifecycle = getCompanyLifecycleFromRecord(company)
  if (lifecycle !== 'active') {
    return domainFailure('COMPANY_NOT_ACTIVE', 'Bu islem yalnizca aktif sirketlerde yapilabilir.', 409, { lifecycle })
  }
  return domainSuccess(company)
}

export async function assertCompanyNotDeregistered(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  const result = await getCompanyById(context, companyId)
  if (!result.ok) return result
  const company = result.data as Record<string, any>
  const lifecycle = getCompanyLifecycleFromRecord(company)
  if (lifecycle === 'deregistered') {
    return domainFailure('COMPANY_DEREGISTERED', 'Terkin edilmis sirketlerde yeni resmi islem yapilamaz.', 409, { lifecycle })
  }
  return domainSuccess(company)
}

export async function updateOfficialCompanyFields(
  context: DomainServiceContext,
  companyId: string,
  patch: Record<string, any>,
): Promise<DomainServiceResult<{ company: Record<string, any>; previousCompany: Record<string, any>; changedFields: string[] }>> {
  const currentResult = await getCompanyById(context, companyId)
  if (!currentResult.ok) return currentResult as DomainServiceResult<any>
  const company = currentResult.data as Record<string, any>
  const changedFields = Object.keys(patch).filter(field => patch[field] !== undefined && !sameValue(patch[field], company[field]))
  if (!changedFields.length) return domainSuccess({ company, previousCompany: company, changedFields })

  const cleanPatch = Object.fromEntries(changedFields.map(field => [field, patch[field] === '' ? null : patch[field]]))
  cleanPatch.field_history = buildFieldHistory(company, cleanPatch, {
    ignoredFields: ['field_history'],
    userLabel: context.userId || 'Sistem Kullanicisi',
  })
  cleanPatch.updated_at = new Date().toISOString()
  cleanPatch.updated_by = context.userId || null
  cleanPatch.version = Number(company.version || 1) + 1

  let query = context.supabase
    .from('companies')
    .update(cleanPatch)
    .eq('id', companyId)
  query = applyTenantQueryScope(query, 'companies', context.tenantContext)
  const { data, error } = await query.select(COMPANY_DOMAIN_SELECT).single()
  if (error) return normalizeCompanyError(error, 'COMPANY_UPDATE_FAILED')
  return domainSuccess({ company: data as Record<string, any>, previousCompany: company, changedFields })
}

export async function getCompanyLifecycle(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<CompanyLifecycleStatus>> {
  const result = await getCompanyById(context, companyId)
  if (!result.ok) return result as DomainServiceResult<any>
  return domainSuccess(getCompanyLifecycleFromRecord(result.data as Record<string, any>))
}

export async function getCompanyDetailReadModel(
  context: DomainServiceContext,
  companyId: string,
) {
  return getCompanyById(context, companyId)
}

export function getCompanyLifecycleFromRecord(company: Record<string, any>): CompanyLifecycleStatus {
  if (company.is_deleted === true) return 'deregistered'
  const values = [company.record_status, company.company_status]
    .map(value => String(value || '').trim().toLocaleLowerCase('tr-TR'))
    .filter(Boolean)

  for (const value of values) {
    if (['draft', 'taslak'].includes(value)) return 'draft'
    if (['active', 'opened', 'aktif'].includes(value)) return 'active'
    if (['liquidation', 'tasfiye', 'tasfiye halinde'].includes(value)) return 'liquidation'
    if (['deregistered', 'passive', 'closed', 'deleted', 'pasif', 'kapali', 'kapanmis', 'terkin'].includes(value)) return 'deregistered'
  }

  return values.length ? 'unknown' : 'active'
}

export class CompanyDomainService {
  readonly domainKey = 'company'

  describeBoundary(context: Pick<DomainServiceContext, 'tenantContext'>) {
    return {
      domainKey: this.domainKey,
      tenantId: context.tenantContext.tenantId,
      owns: ['company', 'company_lifecycle_events', 'company_official_change_transactions'],
    }
  }
}

function normalizeCompanyError<T = never>(error: any, code: string): DomainServiceResult<T> {
  if (isMissingInfrastructureError(error)) {
    return domainFailure('COMPANY_INFRASTRUCTURE_MISSING', 'Sirket altyapisi hazir degil.', 409, error)
  }
  return domainFailure(error?.code || code, error?.message || 'Sirket islemi tamamlanamadi.', 500, error)
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(normalizeComparableValue(left)) === JSON.stringify(normalizeComparableValue(right))
}

function normalizeComparableValue(value: unknown) {
  if (value === undefined || value === '') return null
  if (typeof value === 'string') return value.trim()
  return value
}
