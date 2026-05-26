import 'server-only'

import type { IntegrityCheckDefinition, IntegrityContext } from '../integrity.types'
import { integrityBlocking, integrityCheckOk, integrityWarning, representativesAction, setupAction, technicalCheckWarning } from '../integrityMessages'
import { isActiveStatus, listScoped, maybeSingleScoped, normalizeRecordStatus, sameCompany, textEquals } from '../crossDomainConsistency'

export const branchIntegrityChecks = [
  check('branch_has_valid_company', 'Subenin bagli sirketi gecerli mi?', ['branch_closing'], 'blocking', async context => {
    const branchId = context.branchId || context.entityId || context.payload?.branch_id
    if (!branchId) return integrityBlocking('branch_has_valid_company', 'Sube kaydi secilmelidir.')
    const branch = await loadBranch(context, String(branchId))
    if (branch.missingInfrastructure) return technicalCheckWarning('branch_has_valid_company', 'branches', branch.error)
    if (!branch.data) return integrityBlocking('branch_has_valid_company', 'Sube kaydi bulunamadi.')
    if (context.companyId && !sameCompany(branch.data, context.companyId)) {
      return integrityBlocking('branch_has_valid_company', 'Secilen sube bu sirkete bagli degil.', {
        affectedEntities: [{ entityType: 'company_branch', entityId: String(branchId), label: branch.data.branch_name }],
      })
    }
    return integrityCheckOk('branch_has_valid_company')
  }),

  check('branch_can_close', 'Sube kapanisa uygun mu?', ['branch_closing'], 'blocking', async context => {
    const branchId = context.branchId || context.entityId || context.payload?.branch_id
    if (!branchId) return integrityBlocking('branch_can_close', 'Kapatilacak sube secilmelidir.')
    const branch = await loadBranch(context, String(branchId))
    if (branch.missingInfrastructure) return technicalCheckWarning('branch_can_close', 'branches', branch.error)
    if (!branch.data) return integrityBlocking('branch_can_close', 'Sube kaydi bulunamadi.')
    if (!isActiveStatus(branch.data)) {
      return integrityBlocking('branch_can_close', 'Bu sube zaten kapali veya pasif durumda.', {
        affectedEntities: [{ entityType: 'company_branch', entityId: String(branchId), label: branch.data.branch_name, status: String(branch.data.record_status || branch.data.status || '') }],
      })
    }
    return integrityCheckOk('branch_can_close')
  }),

  check('branch_has_valid_organization_unit', 'Sube organizasyon baglantisi gecerli mi?', ['branch_closing'], 'warning', async context => {
    const branchId = context.branchId || context.entityId || context.payload?.branch_id
    if (!branchId) return integrityCheckOk('branch_has_valid_organization_unit')
    const branch = await loadBranch(context, String(branchId))
    const unitId = branch.data?.organization_unit_id || context.payload?.organization_unit_id
    if (!unitId) return integrityCheckOk('branch_has_valid_organization_unit')
    const unit = await maybeSingleScoped(context.supabase, context.tenantContext, 'organization_units', 'id,company_id,name,status,active,is_deleted', { id: unitId })
    if (unit.missingInfrastructure) return technicalCheckWarning('branch_has_valid_organization_unit', 'organization', unit.error)
    if (!unit.data || !sameCompany(unit.data, context.companyId || branch.data?.company_id)) {
      return integrityWarning('branch_has_valid_organization_unit', 'Subenin organizasyon baglantisi kontrol edilmeli.', {
        affectedEntities: [{ entityType: 'organization_unit', entityId: String(unitId) }],
        suggestedActions: [setupAction('organization')],
      })
    }
    return integrityCheckOk('branch_has_valid_organization_unit')
  }),

  check('branch_has_valid_facility', 'Sube tesis/lokasyon baglantisi gecerli mi?', ['branch_closing'], 'warning', async context => {
    const branchId = context.branchId || context.entityId || context.payload?.branch_id
    if (!branchId) return integrityCheckOk('branch_has_valid_facility')
    const branch = await loadBranch(context, String(branchId))
    const facilityId = branch.data?.facility_id || context.payload?.facility_id
    if (!facilityId) return integrityCheckOk('branch_has_valid_facility')
    const facility = await maybeSingleScoped(context.supabase, context.tenantContext, 'company_facilities', 'id,company_id,name,status,record_status,is_deleted', { id: facilityId })
    if (facility.missingInfrastructure) return technicalCheckWarning('branch_has_valid_facility', 'facilities', facility.error)
    if (!facility.data || !sameCompany(facility.data, context.companyId || branch.data?.company_id)) {
      return integrityWarning('branch_has_valid_facility', 'Subenin tesis/lokasyon baglantisi kontrol edilmeli.', {
        affectedEntities: [{ entityType: 'facility', entityId: String(facilityId) }],
        suggestedActions: [setupAction('facilities')],
      })
    }
    return integrityCheckOk('branch_has_valid_facility')
  }),

  check('branch_representative_scope_impact', 'Sube kapsamindaki temsilci yetkileri etkilenir mi?', ['branch_closing'], 'warning', async context => {
    const branchId = context.branchId || context.entityId || context.payload?.branch_id
    if (!branchId) return integrityCheckOk('branch_representative_scope_impact')
    const authorities = await listScoped(context.supabase, context.tenantContext, 'v_current_representative_authorities', 'id,representative_id,display_name,representative_name,authority_status,authority_record_status,scope_type,branch_id', {
      branch_id: branchId,
      scope_type: 'branch',
    }, { limit: 25 })
    if (authorities.missingInfrastructure) return technicalCheckWarning('branch_representative_scope_impact', 'representatives', authorities.error)
    const active = authorities.data.filter(row => isActiveStatus(row))
    if (!active.length) return integrityCheckOk('branch_representative_scope_impact')
    return integrityWarning('branch_representative_scope_impact', 'Bu sube kapsaminda aktif temsilci yetkileri var. Kapanis oncesinde bu yetkileri kontrol edin.', {
      affectedEntities: active.map(row => ({
        entityType: 'company_representative',
        entityId: String(row.representative_id || row.id),
        label: row.display_name || row.representative_name || 'Temsilci',
        status: String(row.authority_record_status || row.authority_status || ''),
      })),
      suggestedActions: [representativesAction(String(branchId))],
      metadata: { activeAuthorityCount: active.length },
    })
  }),

  check('branch_open_process_conflict', 'Sube icin devam eden surec var mi?', ['branch_closing', 'branch_opening'], 'blocking', async context => {
    const branchId = context.branchId || context.entityId || context.payload?.branch_id
    if (!branchId) return integrityCheckOk('branch_open_process_conflict')
    const processes = await listScoped(context.supabase, context.tenantContext, 'process_instances', 'id,status,process_key,entity_id,current_step_key', {
      entity_id: branchId,
    }, { limit: 10 })
    if (processes.missingInfrastructure) return integrityCheckOk('branch_open_process_conflict')
    const active = processes.data.filter(row => ['draft', 'active', 'waiting_approval'].includes(normalizeRecordStatus(row.status)))
    if (!active.length) return integrityCheckOk('branch_open_process_conflict')
    return integrityBlocking('branch_open_process_conflict', 'Bu sube icin devam eden bir surec var.', {
      affectedEntities: active.map(row => ({ entityType: 'process_instance', entityId: String(row.id), label: row.process_key, status: row.status })),
      suggestedActions: [{ label: 'Sureci ac', targetPage: `/app/surecler/${active[0].id}` }],
    })
  }),

  check('branch_can_open', 'Sube acilisi veri tutarliligi uygun mu?', ['branch_opening'], 'blocking', async context => {
    const companyId = context.companyId || context.payload?.company_id
    const branchName = context.payload?.branch_name
    if (!companyId || !branchName) return integrityBlocking('branch_can_open', 'Sube acilisi icin sirket ve sube adi zorunludur.')
    const existing = await listScoped(context.supabase, context.tenantContext, 'company_branches', 'id,branch_name,status,record_status,is_deleted,trade_registry_number', {
      company_id: companyId,
    }, { limit: 100 })
    if (existing.missingInfrastructure) return technicalCheckWarning('branch_can_open', 'branches', existing.error)
    const sameName = existing.data.find(row => isActiveStatus(row) && textEquals(row.branch_name, branchName))
    if (sameName) {
      return integrityBlocking('branch_can_open', 'Ayni sirket altinda ayni adla aktif bir sube bulunuyor.', {
        affectedEntities: [{ entityType: 'company_branch', entityId: String(sameName.id), label: sameName.branch_name }],
      })
    }
    const registryNumber = context.payload?.trade_registry_number
    const sameRegistry = registryNumber ? existing.data.find(row => isActiveStatus(row) && textEquals(row.trade_registry_number, registryNumber)) : null
    if (sameRegistry) {
      return integrityWarning('branch_can_open', 'Ayni ticaret sicil numarasiyla aktif bir sube bulunuyor; bilgileri kontrol edin.', {
        affectedEntities: [{ entityType: 'company_branch', entityId: String(sameRegistry.id), label: sameRegistry.branch_name }],
      })
    }
    return integrityCheckOk('branch_can_open')
  }),

  check('facility_branch_link_consistency', 'Sube lokasyon baglantisi tutarli mi?', ['branch_opening'], 'warning', async context => {
    if (context.payload?.create_facility !== false) return integrityCheckOk('facility_branch_link_consistency')
    const companyId = context.companyId || context.payload?.company_id
    const address = context.payload?.address
    if (!companyId || !address) return integrityCheckOk('facility_branch_link_consistency')
    const facilities = await listScoped(context.supabase, context.tenantContext, 'company_facilities', 'id,name,address,status,record_status,is_deleted', {
      company_id: companyId,
    }, { limit: 100 })
    if (facilities.missingInfrastructure) return integrityCheckOk('facility_branch_link_consistency')
    const sameAddress = facilities.data.find(row => isActiveStatus(row) && textEquals(row.address, address))
    if (!sameAddress) return integrityCheckOk('facility_branch_link_consistency')
    return integrityWarning('facility_branch_link_consistency', 'Ayni adreste mevcut bir lokasyon bulunuyor; yeni lokasyon acmadan mevcut lokasyonla iliskilendirmeyi degerlendirin.', {
      affectedEntities: [{ entityType: 'facility', entityId: String(sameAddress.id), label: sameAddress.name }],
      suggestedActions: [{ label: 'Tesisler/Lokasyonlar sayfasina git', targetPage: '/app/sirket/tesisler' }],
    })
  }),
] satisfies IntegrityCheckDefinition[]

function check(
  key: string,
  label: string,
  operationKeys: string[],
  severity: 'warning' | 'blocking',
  run: IntegrityCheckDefinition['run']
): IntegrityCheckDefinition {
  return { key, label, domain: 'company', moduleKey: 'branches', entityType: 'company_branch', operationKeys, severity, run }
}

function loadBranch(context: IntegrityContext, branchId: string) {
  return maybeSingleScoped(context.supabase, context.tenantContext, 'company_branches', 'id,tenant_id,company_id,branch_name,status,record_status,is_deleted,organization_unit_id,facility_id,trade_registry_number', { id: branchId })
}
