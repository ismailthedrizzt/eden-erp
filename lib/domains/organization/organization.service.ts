import 'server-only'

import { applyTenantQueryScope, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { domainFailure, domainSuccess } from '../domainServiceResponse'
import type { DomainServiceContext, DomainServiceResult } from '../domainService.types'
import type { BranchOrganizationUnitPayload } from './organization.types'

export const ORGANIZATION_UNIT_SELECT = 'id,company_id,parent_unit_id,unit_type_id,name,type,short_name,code,location_name,status,start_date,end_date,active,is_deleted,history,updated_at,version'

export async function getOrganizationUnitById(
  context: DomainServiceContext,
  unitId: string,
): Promise<DomainServiceResult<Record<string, any> | null>> {
  let query = context.supabase
    .from('organization_units')
    .select(ORGANIZATION_UNIT_SELECT)
    .eq('id', unitId)
    .eq('is_deleted', false)
  query = applyTenantQueryScope(query, 'organization_units', context.tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) return normalizeOrganizationError(error, 'ORGANIZATION_UNIT_FETCH_FAILED')
  return domainSuccess((data || null) as Record<string, any> | null)
}

export async function listOrganizationUnitsForCompany(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>[]>> {
  let query = context.supabase
    .from('organization_units')
    .select(ORGANIZATION_UNIT_SELECT)
    .eq('company_id', companyId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  query = applyTenantQueryScope(query, 'organization_units', context.tenantContext)
  const { data, error } = await query
  if (error) return normalizeOrganizationError(error, 'ORGANIZATION_UNIT_LIST_FAILED', [])
  return domainSuccess((data || []) as Record<string, any>[])
}

export async function createBranchOrganizationUnit(
  context: DomainServiceContext,
  payload: BranchOrganizationUnitPayload,
): Promise<DomainServiceResult<Record<string, any> | null>> {
  const { data: unitType, error: unitTypeError } = await context.supabase
    .from('organization_unit_types')
    .upsert({ name: 'Sube', slug: 'branch', color: '#0f766e', icon: 'Building2', sort_order: 70, is_active: true }, { onConflict: 'slug' })
    .select('id')
    .single()
  if (unitTypeError) {
    if (isMissingInfrastructureError(unitTypeError)) {
      return domainFailure('ORGANIZATION_INFRASTRUCTURE_MISSING', 'Organizasyon altyapisi hazir degil.', 409, unitTypeError)
    }
    return normalizeOrganizationError(unitTypeError, 'ORGANIZATION_UNIT_TYPE_UPSERT_FAILED')
  }

  const rootResult = await getCompanyRootUnitId(context, payload.companyId)
  if (!rootResult.ok) return rootResult as DomainServiceResult<any>
  const now = new Date().toISOString()
  const row = withTenantInsertScopeForTable({
    company_id: payload.companyId,
    parent_unit_id: payload.parentUnitId || rootResult.data || null,
    unit_type_id: unitType?.id || null,
    name: payload.branchName,
    short_name: payload.branchShortName || null,
    type: 'branch',
    location_name: payload.locationName || null,
    status: 'Aktif',
    start_date: emptyToNull(payload.startDate),
    notes: payload.notes || null,
    active: true,
    is_deleted: false,
    created_at: now,
    updated_at: now,
  }, 'organization_units', context.tenantContext)

  const { data, error } = await context.supabase
    .from('organization_units')
    .insert(row)
    .select(ORGANIZATION_UNIT_SELECT)
    .single()
  if (error) return normalizeOrganizationError(error, 'BRANCH_ORGANIZATION_UNIT_CREATE_FAILED')
  return domainSuccess(data as Record<string, any>)
}

export async function setOrganizationUnitPassive(
  context: DomainServiceContext,
  unitId: string,
  payload: { endDate?: string | null } = {},
): Promise<DomainServiceResult<Record<string, any> | null>> {
  const currentResult = await getOrganizationUnitById(context, unitId)
  if (!currentResult.ok) return currentResult
  const current = currentResult.data
  if (!current) return domainSuccess(null)

  let query = context.supabase
    .from('organization_units')
    .update({
      status: 'Pasif',
      active: false,
      end_date: emptyToNull(payload.endDate),
      history: appendHistoryEntry(current.history, 'branch_closed_unit_deactivated', {
        message: 'Sube kapatildi ve organizasyon birimi pasife alindi.',
        end_date: payload.endDate || null,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', unitId)
  query = applyTenantQueryScope(query, 'organization_units', context.tenantContext)
  const { data, error } = await query.select(ORGANIZATION_UNIT_SELECT).single()
  if (error) return normalizeOrganizationError(error, 'ORGANIZATION_UNIT_PASSIVATE_FAILED', null)
  return domainSuccess((data || null) as Record<string, any> | null)
}

export async function reassignOrganizationUnit(
  context: DomainServiceContext,
  unitId: string,
  targetParentUnitId?: string | null,
  payload: { companyId: string; endDate?: string | null } = { companyId: '' },
): Promise<DomainServiceResult<{ unit: Record<string, any> | null; target?: Record<string, any> | null }>> {
  const validation = await assertValidOrganizationUnitReassignTarget(context, {
    companyId: payload.companyId,
    unitId,
    targetUnitId: targetParentUnitId,
  })
  if (!validation.ok) return validation as DomainServiceResult<any>

  const current = validation.data?.unit || null
  let query = context.supabase
    .from('organization_units')
    .update({
      parent_unit_id: targetParentUnitId || null,
      history: appendHistoryEntry(current?.history, 'branch_closed_unit_reassigned', {
        message: 'Sube kapatildi; organizasyon birimi hedef birime baglandi.',
        previous_parent_unit_id: current?.parent_unit_id || null,
        target_organization_unit_id: targetParentUnitId || null,
        end_date: payload.endDate || null,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', unitId)
  query = applyTenantQueryScope(query, 'organization_units', context.tenantContext)
  const { data, error } = await query.select(ORGANIZATION_UNIT_SELECT).single()
  if (error) return normalizeOrganizationError(error, 'ORGANIZATION_UNIT_REASSIGN_FAILED')
  return domainSuccess({ unit: data as Record<string, any>, target: validation.data?.target || null })
}

export async function keepOrganizationUnitOpenAfterBranchClosing(
  context: DomainServiceContext,
  unitId: string,
  payload: { endDate?: string | null } = {},
): Promise<DomainServiceResult<Record<string, any> | null>> {
  const currentResult = await getOrganizationUnitById(context, unitId)
  if (!currentResult.ok) return currentResult
  const current = currentResult.data
  if (!current) return domainSuccess(null)

  let query = context.supabase
    .from('organization_units')
    .update({
      history: appendHistoryEntry(current.history, 'branch_closed_unit_kept_open', {
        message: 'Sube kapatildi ancak organizasyon birimi acik birakildi.',
        end_date: payload.endDate || null,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', unitId)
  query = applyTenantQueryScope(query, 'organization_units', context.tenantContext)
  const { data, error } = await query.select(ORGANIZATION_UNIT_SELECT).single()
  if (error) return normalizeOrganizationError(error, 'ORGANIZATION_UNIT_KEEP_OPEN_FAILED', null)
  return domainSuccess((data || null) as Record<string, any> | null)
}

export async function assertOrganizationUnitBelongsToCompany(
  context: DomainServiceContext,
  unitId: string,
  companyId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  const result = await getOrganizationUnitById(context, unitId)
  if (!result.ok) return result as DomainServiceResult<any>
  const unit = result.data
  if (!unit) return domainFailure('ORGANIZATION_UNIT_NOT_FOUND', 'Organizasyon birimi bulunamadi.', 404)
  if (unit.company_id !== companyId) return domainFailure('ORGANIZATION_UNIT_COMPANY_MISMATCH', 'Secilen organizasyon birimi bu sirkete bagli degil.', 409)
  return domainSuccess(unit)
}

export async function assertOrganizationUnitActive(
  context: DomainServiceContext,
  unitId: string,
): Promise<DomainServiceResult<Record<string, any>>> {
  const result = await getOrganizationUnitById(context, unitId)
  if (!result.ok) return result as DomainServiceResult<any>
  const unit = result.data
  if (!unit) return domainFailure('ORGANIZATION_UNIT_NOT_FOUND', 'Organizasyon birimi bulunamadi.', 404)
  if (!isActiveOrganizationUnit(unit)) return domainFailure('ORGANIZATION_UNIT_NOT_ACTIVE', 'Kapali veya pasif organizasyon birimi icin bu islem yapilamaz.', 409)
  return domainSuccess(unit)
}

export async function wouldCreateOrganizationCycle(
  context: DomainServiceContext,
  unitId: string,
  targetParentUnitId?: string | null,
): Promise<DomainServiceResult<boolean>> {
  if (!targetParentUnitId) return domainSuccess(false)
  const unitResult = await getOrganizationUnitById(context, unitId)
  if (!unitResult.ok) return unitResult as DomainServiceResult<any>
  const unit = unitResult.data
  if (!unit) return domainFailure('ORGANIZATION_UNIT_NOT_FOUND', 'Organizasyon birimi bulunamadi.', 404)
  const listResult = await listOrganizationUnitsForCompany(context, unit.company_id)
  if (!listResult.ok) return listResult as DomainServiceResult<any>
  return domainSuccess(wouldCreateCycle(listResult.data || [], unitId, targetParentUnitId))
}

export async function getCompanyRootUnitId(
  context: DomainServiceContext,
  companyId: string,
): Promise<DomainServiceResult<string | null>> {
  let query = context.supabase
    .from('organization_units')
    .select('id')
    .eq('company_id', companyId)
    .is('parent_unit_id', null)
    .eq('type', 'company')
    .eq('is_deleted', false)
    .limit(1)
  query = applyTenantQueryScope(query, 'organization_units', context.tenantContext)
  const { data, error } = await query.maybeSingle()
  if (error) {
    if (isMissingInfrastructureError(error)) return domainSuccess(null, ['Organizasyon kok birimi bulunamadi.'])
    return normalizeOrganizationError(error, 'ORGANIZATION_ROOT_FETCH_FAILED')
  }
  return domainSuccess(data?.id || null)
}

export async function assertValidOrganizationUnitReassignTarget(
  context: DomainServiceContext,
  input: { companyId: string; unitId: string; targetUnitId?: string | null },
): Promise<DomainServiceResult<{ unit: Record<string, any>; target: Record<string, any> }>> {
  if (!input.targetUnitId) return domainFailure('TARGET_ORGANIZATION_UNIT_REQUIRED', 'Organizasyon birimi baska birime baglanacaksa hedef birim secilmelidir.', 400, { fieldErrors: { target_organization_unit_id: 'Hedef birim zorunludur.' } })
  if (input.targetUnitId === input.unitId) return domainFailure('TARGET_ORGANIZATION_UNIT_SELF', 'Organizasyon birimi kendisine baglanamaz.', 400, { fieldErrors: { target_organization_unit_id: 'Kendi birimi secilemez.' } })

  const unitsResult = await listOrganizationUnitsForCompany(context, input.companyId)
  if (!unitsResult.ok) return unitsResult as DomainServiceResult<any>
  const units = unitsResult.data || []
  const unit = units.find(row => row.id === input.unitId) || null
  const target = units.find(row => row.id === input.targetUnitId) || null
  if (!unit) return domainFailure('ORGANIZATION_UNIT_NOT_FOUND', 'Subeye bagli organizasyon birimi bulunamadi.', 404)
  if (!target) return domainFailure('TARGET_ORGANIZATION_UNIT_NOT_IN_COMPANY', 'Hedef organizasyon birimi ayni sirket altinda bulunmalidir.', 400, { fieldErrors: { target_organization_unit_id: 'Ayni sirketten hedef birim secin.' } })
  if (!isActiveOrganizationUnit(target)) return domainFailure('TARGET_ORGANIZATION_UNIT_INACTIVE', 'Kapali veya pasif organizasyon birimine yeniden baglama yapilamaz.', 400, { fieldErrors: { target_organization_unit_id: 'Aktif hedef birim secin.' } })
  if (wouldCreateCycle(units, input.unitId, input.targetUnitId)) return domainFailure('ORGANIZATION_UNIT_CYCLE', 'Bu yeniden baglama organizasyon agacinda dongu olusturur.', 400, { fieldErrors: { target_organization_unit_id: 'Alt birime baglanamaz.' } })
  return domainSuccess({ unit, target })
}

export class OrganizationDomainService {
  readonly domainKey = 'organization'

  describeBoundary(context: Pick<DomainServiceContext, 'tenantContext'>) {
    return {
      domainKey: this.domainKey,
      tenantId: context.tenantContext.tenantId,
      owns: ['organization_units', 'organization_unit_types', 'positions'],
      rule: 'Organization unit is hierarchy/staffing structure; it is not a branch.',
    }
  }
}

function normalizeOrganizationError<T = never>(error: any, code: string, fallbackData?: T): DomainServiceResult<T> {
  if (isMissingInfrastructureError(error) && fallbackData !== undefined) {
    return domainSuccess(fallbackData, ['Organizasyon altyapisi hazir degil.'])
  }
  if (isMissingInfrastructureError(error)) {
    return domainFailure('ORGANIZATION_INFRASTRUCTURE_MISSING', 'Organizasyon altyapisi hazir degil.', 409, error)
  }
  return domainFailure(error?.code || code, error?.message || 'Organizasyon islemi tamamlanamadi.', 500, error)
}

function isActiveOrganizationUnit(unit: Record<string, any>) {
  const status = normalizeStatus(unit.status)
  return unit.is_deleted !== true && unit.active !== false && !['passive', 'closed', 'deleted'].includes(status)
}

function wouldCreateCycle(units: Record<string, any>[], unitId: string, targetUnitId: string) {
  const byId = new Map(units.map(unit => [unit.id, unit]))
  let cursor = byId.get(targetUnitId)
  const seen = new Set<string>()
  while (cursor?.id && !seen.has(cursor.id)) {
    if (cursor.id === unitId) return true
    seen.add(cursor.id)
    cursor = cursor.parent_unit_id ? byId.get(cursor.parent_unit_id) : undefined
  }
  return false
}

function appendHistoryEntry(history: unknown, event: string, payload: Record<string, any>) {
  const rows = Array.isArray(history) ? history : []
  return [...rows, { event, payload, changed_at: new Date().toISOString() }]
}

function emptyToNull(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  return value
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
