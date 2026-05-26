import 'server-only'

import type { IntegrityCheckDefinition } from '../integrity.types'
import { integrityBlocking, integrityCheckOk, integrityWarning, representativesAction, technicalCheckWarning } from '../integrityMessages'
import { isActiveStatus, listScoped, maybeSingleScoped, sameCompany } from '../crossDomainConsistency'

const representativeOps = ['representative_start', 'representative_authority_scope_change', 'representative_authority_update', 'representative_terminate']

export const representativeIntegrityChecks = [
  check('representative_unique_card_per_company', ['representative_start'], 'blocking', async context => {
    const companyId = context.companyId || context.payload?.company_id
    const sourceType = context.payload?.source_type || context.payload?.person_kind
    const sourceId = context.payload?.source_id || context.payload?.person_id || context.payload?.organization_id
    if (!companyId || !sourceId) return integrityCheckOk('representative_unique_card_per_company')
    const rows = await listScoped(context.supabase, context.tenantContext, 'company_representatives', 'id,display_name,company_id,source_type,source_id,person_id,organization_id,is_deleted,record_status,status', { company_id: companyId }, { limit: 100 })
    if (rows.missingInfrastructure) return technicalCheckWarning('representative_unique_card_per_company', 'representatives', rows.error)
    const duplicate = rows.data.find(row =>
      row.is_deleted !== true
      && (String(row.source_id || row.person_id || row.organization_id || '') === String(sourceId))
      && (!sourceType || !row.source_type || String(row.source_type) === String(sourceType))
    )
    if (!duplicate || duplicate.id === context.representativeId) return integrityCheckOk('representative_unique_card_per_company')
    return integrityBlocking('representative_unique_card_per_company', 'Ayni kisi/kurum bu sirket icinde zaten temsilci kartina sahip. Yeni kart acmak yerine mevcut kartta yetki islemi yapin.', {
      affectedEntities: [{ entityType: 'company_representative', entityId: String(duplicate.id), label: duplicate.display_name }],
      suggestedActions: [{ label: 'Mevcut temsilci kartini ac', targetPage: `/app/sirket/companies/representatives?id=${duplicate.id}` }],
    })
  }),

  check('representative_scope_valid', representativeOps, 'blocking', async context => {
    const scopeType = String(context.payload?.scope_type || 'company_wide')
    const companyId = context.companyId || context.payload?.company_id
    if (scopeType === 'company_wide') {
      if (context.payload?.branch_id || context.payload?.organization_unit_id || context.payload?.facility_id) {
        return integrityBlocking('representative_scope_valid', 'Sirket geneli yetkide sube, organizasyon birimi veya tesis/lokasyon secilmemelidir.')
      }
      return integrityCheckOk('representative_scope_valid')
    }
    if (scopeType === 'branch' && !context.payload?.branch_id) return integrityBlocking('representative_scope_valid', 'Sube bazli yetki icin aktif bir sube secmelisiniz.')
    if (scopeType === 'organization_unit' && !context.payload?.organization_unit_id) return integrityBlocking('representative_scope_valid', 'Organizasyon birimi bazli yetki icin aktif bir organizasyon birimi secmelisiniz.')
    if (scopeType === 'facility' && !context.payload?.facility_id) return integrityBlocking('representative_scope_valid', 'Tesis/lokasyon bazli yetki icin aktif bir tesis/lokasyon secmelisiniz.')
    const ref = await loadScopeReference(context, scopeType)
    if (ref.missingInfrastructure) return technicalCheckWarning('representative_scope_valid', scopeType === 'branch' ? 'branches' : scopeType === 'facility' ? 'facilities' : 'organization', ref.error)
    if (!ref.data || !sameCompany(ref.data, companyId)) {
      return integrityBlocking('representative_scope_valid', 'Secilen yetki kapsami bu sirkete bagli degil.')
    }
    return integrityCheckOk('representative_scope_valid')
  }),

  check('representative_scope_not_closed', representativeOps, 'blocking', async context => {
    const scopeType = String(context.payload?.scope_type || 'company_wide')
    if (scopeType === 'company_wide' || context.operationKey === 'representative_terminate') return integrityCheckOk('representative_scope_not_closed')
    const ref = await loadScopeReference(context, scopeType)
    if (ref.missingInfrastructure || !ref.data) return integrityCheckOk('representative_scope_not_closed')
    if (!isActiveStatus(ref.data)) {
      return integrityBlocking('representative_scope_not_closed', 'Kapali veya pasif kapsam icin yeni aktif temsil yetkisi verilemez.', {
        affectedEntities: [{ entityType: scopeType, entityId: String(ref.data.id), label: ref.data.name || ref.data.branch_name }],
      })
    }
    return integrityCheckOk('representative_scope_not_closed')
  }),

  check('representative_authority_no_conflict', representativeOps, 'warning', async context => {
    const representativeId = context.representativeId || context.entityId || context.payload?.representative_id
    const scopeType = String(context.payload?.scope_type || 'company_wide')
    if (!representativeId) return integrityCheckOk('representative_authority_no_conflict')
    const rows = await listScoped(context.supabase, context.tenantContext, 'v_current_representative_authorities', 'id,representative_id,authority_types,authority_type,scope_type,branch_id,organization_unit_id,facility_id,authority_status,authority_record_status', { representative_id: representativeId }, { limit: 100 })
    if (rows.missingInfrastructure) return integrityCheckOk('representative_authority_no_conflict')
    const sameScope = rows.data.filter(row =>
      isActiveStatus(row)
      && String(row.scope_type || 'company_wide') === scopeType
      && String(row.branch_id || '') === String(context.payload?.branch_id || '')
      && String(row.organization_unit_id || '') === String(context.payload?.organization_unit_id || '')
      && String(row.facility_id || '') === String(context.payload?.facility_id || '')
    )
    if (!sameScope.length) return integrityCheckOk('representative_authority_no_conflict')
    return integrityWarning('representative_authority_no_conflict', 'Ayni temsilci ve kapsam icin aktif yetki bulunuyor; yeni islem once mevcut yetkiyle cakismadigindan emin olun.', {
      affectedEntities: sameScope.map(row => ({ entityType: 'representative_authority', entityId: String(row.id), status: row.authority_record_status || row.authority_status })),
      suggestedActions: [representativesAction(context.payload?.branch_id)],
    })
  }),

  check('branch_closing_representative_impact', ['branch_closing'], 'warning', async context =>
    integrityCheckOk('branch_closing_representative_impact')
  ),
] satisfies IntegrityCheckDefinition[]

function check(
  key: string,
  operationKeys: string[],
  severity: 'warning' | 'blocking',
  run: IntegrityCheckDefinition['run']
): IntegrityCheckDefinition {
  return { key, label: key, domain: 'company', moduleKey: 'representatives', entityType: 'company_representative', operationKeys, severity, run }
}

function loadScopeReference(context: Parameters<IntegrityCheckDefinition['run']>[0], scopeType: string) {
  if (scopeType === 'branch') {
    return maybeSingleScoped(context.supabase, context.tenantContext, 'company_branches', 'id,company_id,branch_name,status,record_status,is_deleted', { id: context.payload?.branch_id })
  }
  if (scopeType === 'organization_unit') {
    return maybeSingleScoped(context.supabase, context.tenantContext, 'organization_units', 'id,company_id,name,status,active,is_deleted', { id: context.payload?.organization_unit_id })
  }
  if (scopeType === 'facility') {
    return maybeSingleScoped(context.supabase, context.tenantContext, 'company_facilities', 'id,company_id,name,status,record_status,is_deleted', { id: context.payload?.facility_id })
  }
  return Promise.resolve({ data: null, missingInfrastructure: false as const, error: null })
}
