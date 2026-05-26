import 'server-only'

import { applyTenantQueryScope } from '@/lib/tenancy/server'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { domainFailure, domainSuccess } from '../domainServiceResponse'
import type { DomainServiceContext, DomainServiceResult } from '../domainService.types'
import type { OwnershipDistributionValidation } from './ownership.types'

export const CURRENT_OWNERSHIP_SELECT = 'company_id,partner_id,display_name,current_share_ratio,current_voting_ratio,current_profit_ratio,current_capital_amount,current_share_units,committed_capital_amount,paid_capital_amount,status,record_status,warnings'
export const PARTNER_SELECT = 'id,company_id,person_id,organization_id,owner_kind,partner_type,display_name,partner_name,share_ratio,voting_ratio,profit_ratio,capital_amount,paid_capital_amount,status,record_status,is_deleted,start_date,end_date,created_at,updated_at,version'

export async function getCurrentOwnershipForCompany(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>[]>> {
  let query = context.supabase
    .from('v_current_ownership')
    .select(CURRENT_OWNERSHIP_SELECT)
    .eq('company_id', companyId)
  query = applyTenantQueryScope(query, 'v_current_ownership', context.tenantContext)
  const { data, error } = await query
  if (error) return normalizeOwnershipError(error, 'CURRENT_OWNERSHIP_FETCH_FAILED')
  return domainSuccess((data || []) as Record<string, any>[])
}

export async function assertCurrentOwnershipReadable(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>[]>> {
  const result = await getCurrentOwnershipForCompany(context, companyId)
  if (!result.ok) return result
  if (!result.data?.length) return domainFailure('CURRENT_OWNERSHIP_EMPTY', 'Guncel ortaklik dagilimi okunamadi.', 409)
  return result
}

export async function assertHasActivePartners(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>[]>> {
  const partnersResult = await listPartnersForCompany(context, companyId)
  if (!partnersResult.ok) return partnersResult
  const activePartners = (partnersResult.data || []).filter(isActivePartner)
  if (!activePartners.length) {
    return domainFailure('ACTIVE_PARTNER_REQUIRED', 'Bu islem icin aktif ortak kaydi gereklidir.', 409)
  }
  return domainSuccess(activePartners)
}

export async function validateOwnershipDistribution(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<OwnershipDistributionValidation>> {
  const ownershipResult = await assertCurrentOwnershipReadable(context, companyId)
  if (!ownershipResult.ok) return ownershipResult as DomainServiceResult<any>
  const rows = ownershipResult.data || []
  const activeRows = rows.filter(isActivePartner)
  const totalShareRatio = roundRatio(activeRows.reduce((sum, row) => sum + numberValue(row.current_share_ratio ?? row.share_ratio), 0))
  const warnings = rows.flatMap(row => Array.isArray(row.warnings) ? row.warnings : [])
  const blockingReasons: string[] = []

  if (!activeRows.length) blockingReasons.push('Aktif ortak bulunmuyor.')
  if (Math.abs(totalShareRatio - 100) > 0.05) {
    warnings.push(`Guncel ortaklik dagilimi %${totalShareRatio} gorunuyor; toplam %100 olmalidir.`)
  }

  return domainSuccess({
    totalShareRatio,
    activePartnerCount: activeRows.length,
    warnings,
    blockingReasons,
  }, warnings)
}

export async function getPartnerById(
  context: DomainServiceContext,
  partnerId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  let query = context.supabase
    .from('company_partners')
    .select(PARTNER_SELECT)
    .eq('id', partnerId)
    .eq('is_deleted', false)
  query = applyTenantQueryScope(query, 'company_partners', context.tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) return normalizeOwnershipError(error, 'PARTNER_FETCH_FAILED')
  if (!data) return domainFailure('PARTNER_NOT_FOUND', 'Ortak kaydi bulunamadi.', 404)
  return domainSuccess(data as Record<string, any>)
}

export async function listPartnersForCompany(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>[]>> {
  let query = context.supabase
    .from('company_partners')
    .select(PARTNER_SELECT)
    .eq('company_id', companyId)
    .eq('is_deleted', false)
    .order('display_name', { ascending: true })
  query = applyTenantQueryScope(query, 'company_partners', context.tenantContext)
  const { data, error } = await query
  if (error) return normalizeOwnershipError(error, 'PARTNER_LIST_FAILED', [])
  return domainSuccess((data || []) as Record<string, any>[])
}

export async function buildOwnershipSnapshot(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<{ currentOwnership: Record<string, any>[]; partners: Record<string, any>[]; validation: OwnershipDistributionValidation | null }>> {
  const [ownership, partners, validation] = await Promise.all([
    getCurrentOwnershipForCompany(context, companyId),
    listPartnersForCompany(context, companyId),
    validateOwnershipDistribution(context, companyId).catch(error => domainFailure('OWNERSHIP_VALIDATION_FAILED', error?.message || 'Ortaklik dagilimi kontrol edilemedi.', 500)),
  ])
  if (!ownership.ok) return ownership as DomainServiceResult<any>
  if (!partners.ok) return partners as DomainServiceResult<any>
  return domainSuccess({
    currentOwnership: ownership.data || [],
    partners: partners.data || [],
    validation: validation.ok ? validation.data || null : null,
  }, [...(ownership.warnings || []), ...(partners.warnings || []), ...(validation.warnings || [])])
}

export class OwnershipDomainService {
  readonly domainKey = 'ownership'

  describeBoundary(context: Pick<DomainServiceContext, 'tenantContext'>) {
    return {
      domainKey: this.domainKey,
      tenantId: context.tenantContext.tenantId,
      owns: ['company_partners', 'ownership_transactions', 'v_current_ownership'],
    }
  }
}

function normalizeOwnershipError<T = never>(error: any, code: string, fallbackData?: T): DomainServiceResult<T> {
  if (isMissingInfrastructureError(error) && fallbackData !== undefined) {
    return domainSuccess(fallbackData, ['Ortaklik altyapisi hazir degil.'])
  }
  if (isMissingInfrastructureError(error)) {
    return domainFailure('OWNERSHIP_INFRASTRUCTURE_MISSING', 'Ortaklik altyapisi hazir degil.', 409, error)
  }
  return domainFailure(error?.code || code, error?.message || 'Ortaklik islemi tamamlanamadi.', 500, error)
}

function isActivePartner(row: Record<string, any>) {
  const statuses = [row.record_status, row.status].map(value => normalizeStatus(value))
  return row.is_deleted !== true && statuses.some(status => status === 'active')
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
  return normalized
}

function numberValue(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function roundRatio(value: number) {
  return Math.round(value * 10000) / 10000
}
