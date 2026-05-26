import 'server-only'

import { applyTenantQueryScope, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { domainFailure, domainSuccess } from '../domainServiceResponse'
import type { DomainServiceContext, DomainServiceResult } from '../domainService.types'
import type { BranchFacilityPayload } from './facility.types'

export const FACILITY_SELECT = 'id,tenant_id,company_id,branch_id,facility_name,facility_type,country,city,district,neighborhood,address,postal_code,phone,email,status,record_status,start_date,end_date,notes,metadata_json,created_at,updated_at,version,is_deleted'

export async function getFacilityById(
  context: DomainServiceContext,
  facilityId: string,
): Promise<DomainServiceResult<Record<string, any> | null>> {
  let query = context.supabase
    .from('company_facilities')
    .select(FACILITY_SELECT)
    .eq('id', facilityId)
    .eq('is_deleted', false)
  query = applyTenantQueryScope(query, 'company_facilities', context.tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) return normalizeFacilityError(error, 'FACILITY_FETCH_FAILED')
  return domainSuccess((data || null) as Record<string, any> | null)
}

export async function listFacilitiesForCompany(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>[]>> {
  let query = context.supabase
    .from('company_facilities')
    .select(FACILITY_SELECT)
    .eq('company_id', companyId)
    .eq('is_deleted', false)
    .order('facility_name', { ascending: true })
  query = applyTenantQueryScope(query, 'company_facilities', context.tenantContext)
  const { data, error } = await query
  if (error) return normalizeFacilityError(error, 'FACILITY_LIST_FAILED', [])
  return domainSuccess((data || []) as Record<string, any>[])
}

export async function createFacilityForBranch(
  context: DomainServiceContext,
  payload: BranchFacilityPayload,
): Promise<DomainServiceResult<Record<string, any> | null>> {
  const now = new Date().toISOString()
  const row = withTenantInsertScopeForTable({
    company_id: payload.companyId,
    branch_id: null,
    facility_name: normalizeOptionalString(payload.facilityName) || payload.branchName,
    facility_type: payload.branchType === 'warehouse_facility' ? 'warehouse_facility' : 'branch_location',
    country: normalizeOptionalString(payload.country),
    city: normalizeOptionalString(payload.city),
    district: normalizeOptionalString(payload.district),
    neighborhood: normalizeOptionalString(payload.neighborhood),
    address: normalizeOptionalString(payload.address),
    postal_code: normalizeOptionalString(payload.postalCode),
    phone: normalizeOptionalString(payload.phone),
    email: normalizeOptionalString(payload.email),
    status: 'active',
    record_status: 'active',
    start_date: emptyToNull(payload.startDate),
    notes: payload.notes || null,
    metadata_json: {
      source: 'branch_opening',
      source_branch_name: payload.branchName,
    },
    created_by: context.userId || null,
    updated_by: context.userId || null,
    created_at: now,
    updated_at: now,
    version: 1,
    is_deleted: false,
  }, 'company_facilities', context.tenantContext)

  const { data, error } = await context.supabase
    .from('company_facilities')
    .insert(row)
    .select(FACILITY_SELECT)
    .single()
  if (error) return normalizeFacilityError(error, 'FACILITY_CREATE_FAILED')
  return domainSuccess(data as Record<string, any>)
}

export async function linkFacilityToBranch(
  context: DomainServiceContext,
  facilityId?: string | null,
  branchId?: string | null,
): Promise<DomainServiceResult<Record<string, any> | null>> {
  if (!facilityId || !branchId) return domainSuccess(null)
  let query = context.supabase
    .from('company_facilities')
    .update({
      branch_id: branchId,
      updated_by: context.userId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', facilityId)
  query = applyTenantQueryScope(query, 'company_facilities', context.tenantContext)
  const { data, error } = await query.select(FACILITY_SELECT).single()
  if (error) return normalizeFacilityError(error, 'FACILITY_BRANCH_LINK_FAILED', null)
  return domainSuccess((data || null) as Record<string, any> | null)
}

export async function setFacilityPassive(
  context: DomainServiceContext,
  facilityId: string,
  payload: { endDate?: string | null } = {},
): Promise<DomainServiceResult<Record<string, any> | null>> {
  const result = await getFacilityById(context, facilityId)
  if (!result.ok) return result
  const facility = result.data
  if (!facility) return domainSuccess(null)
  return updateFacilityRow(context, facility, {
    status: 'closed',
    record_status: 'passive',
    end_date: emptyToNull(payload.endDate),
    metadata_json: appendFacilityMetadata(facility, 'branch_closed_facility_deactivated', {
      message: 'Sube kapatildi ve lokasyon/tesis pasife alindi.',
      branch_closing_action: 'deactivate',
      end_date: payload.endDate || null,
    }),
  })
}

export async function keepFacilityOpenAfterBranchClosing(
  context: DomainServiceContext,
  facilityId: string,
  payload: { endDate?: string | null } = {},
): Promise<DomainServiceResult<Record<string, any> | null>> {
  const result = await getFacilityById(context, facilityId)
  if (!result.ok) return result
  const facility = result.data
  if (!facility) return domainSuccess(null)
  return updateFacilityRow(context, facility, {
    status: facility.status || 'active',
    record_status: facility.record_status || 'active',
    metadata_json: appendFacilityMetadata(facility, 'branch_closed_facility_kept_open', {
      message: 'Sube kapatildi ancak lokasyon/tesis acik birakildi.',
      branch_closing_action: 'keep_open',
      end_date: payload.endDate || null,
    }),
  })
}

export async function markFacilityReusable(
  context: DomainServiceContext,
  facilityId: string,
  payload: { endDate?: string | null } = {},
): Promise<DomainServiceResult<Record<string, any> | null>> {
  const result = await getFacilityById(context, facilityId)
  if (!result.ok) return result
  const facility = result.data
  if (!facility) return domainSuccess(null)
  return updateFacilityRow(context, facility, {
    status: 'reusable',
    record_status: 'active',
    metadata_json: appendFacilityMetadata(facility, 'branch_closed_facility_reusable', {
      message: 'Sube kapatildi; lokasyon/tesis tekrar kullanilabilir olarak isaretlendi.',
      branch_closing_action: 'reuse',
      reusable_after_branch_closing: true,
      end_date: payload.endDate || null,
    }),
  })
}

export async function assertFacilityBelongsToCompany(
  context: DomainServiceContext,
  facilityId: string,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  const result = await getFacilityById(context, facilityId)
  if (!result.ok) return result as DomainServiceResult<any>
  const facility = result.data
  if (!facility) return domainFailure('FACILITY_NOT_FOUND', 'Tesis/lokasyon bulunamadi.', 404)
  if (facility.company_id !== companyId) return domainFailure('FACILITY_COMPANY_MISMATCH', 'Secilen tesis/lokasyon bu sirkete bagli degil.', 409)
  return domainSuccess(facility)
}

export async function assertFacilityActive(
  context: DomainServiceContext,
  facilityId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  const result = await getFacilityById(context, facilityId)
  if (!result.ok) return result as DomainServiceResult<any>
  const facility = result.data
  if (!facility) return domainFailure('FACILITY_NOT_FOUND', 'Tesis/lokasyon bulunamadi.', 404)
  if (!isActiveFacility(facility)) return domainFailure('FACILITY_NOT_ACTIVE', 'Kapali veya pasif tesis/lokasyon icin bu islem yapilamaz.', 409)
  return domainSuccess(facility)
}

export function buildFacilityDisplayLabel(facility: Record<string, any> | null | undefined) {
  if (!facility) return ''
  return facility.facility_name || [facility.district, facility.city].filter(Boolean).join(', ') || facility.id || ''
}

export class FacilityDomainService {
  readonly domainKey = 'facilities'

  describeBoundary(context: Pick<DomainServiceContext, 'tenantContext'>) {
    return {
      domainKey: this.domainKey,
      tenantId: context.tenantContext.tenantId,
      owns: ['facilities', 'locations', 'facility_lifecycle_events'],
      rule: 'Facility is a physical location; it is not a legal branch or organization unit.',
    }
  }
}

async function updateFacilityRow(
  context: DomainServiceContext,
  facility: Record<string, any>,
  patch: Record<string, any>,
): Promise<DomainServiceResult<Record<string, any> | null>> {
  let query = context.supabase
    .from('company_facilities')
    .update({
      ...patch,
      updated_by: context.userId || null,
      updated_at: new Date().toISOString(),
      version: Number(facility.version || 1) + 1,
    })
    .eq('id', facility.id)
  query = applyTenantQueryScope(query, 'company_facilities', context.tenantContext)
  const { data, error } = await query.select(FACILITY_SELECT).single()
  if (error) return normalizeFacilityError(error, 'FACILITY_UPDATE_FAILED', null)
  return domainSuccess((data || null) as Record<string, any> | null)
}

function normalizeFacilityError<T = never>(error: any, code: string, fallbackData?: T): DomainServiceResult<T> {
  if (isMissingInfrastructureError(error) && fallbackData !== undefined) {
    return domainSuccess(fallbackData, ['Tesis/Lokasyon altyapisi hazir degil.'])
  }
  if (isMissingInfrastructureError(error)) {
    return domainFailure('FACILITY_INFRASTRUCTURE_MISSING', 'Tesis/Lokasyon altyapisi hazir degil.', 409, error)
  }
  return domainFailure(error?.code || code, error?.message || 'Tesis/Lokasyon islemi tamamlanamadi.', 500, error)
}

function isActiveFacility(facility: Record<string, any>) {
  const statuses = [facility.record_status, facility.status].map(normalizeStatus)
  return facility.is_deleted !== true && !statuses.some(status => ['closed', 'passive', 'deleted'].includes(status))
}

function appendFacilityMetadata(facility: Record<string, any>, event: string, payload: Record<string, any>) {
  const metadata = facility.metadata_json && typeof facility.metadata_json === 'object' ? facility.metadata_json : {}
  return {
    ...metadata,
    branch_closing_action: payload.branch_closing_action,
    reusable_after_branch_closing: payload.reusable_after_branch_closing ?? metadata.reusable_after_branch_closing,
    history: appendHistoryEntry((metadata as Record<string, any>).history, event, payload),
  }
}

function appendHistoryEntry(history: unknown, event: string, payload: Record<string, any>) {
  const rows = Array.isArray(history) ? history : []
  return [...rows, { event, payload, changed_at: new Date().toISOString() }]
}

function emptyToNull(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  return value
}

function normalizeOptionalString(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : value
  return text === '' || text === undefined ? null : text
}

function normalizeStatus(value: unknown) {
  const normalized = String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (['aktif', 'active'].includes(normalized)) return 'active'
  if (['pasif', 'passive', 'inactive'].includes(normalized)) return 'passive'
  if (['kapali', 'closed'].includes(normalized)) return 'closed'
  return normalized
}
