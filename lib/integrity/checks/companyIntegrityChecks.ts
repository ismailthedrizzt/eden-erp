import 'server-only'

import type { IntegrityCheckDefinition } from '../integrity.types'
import { integrityBlocking, integrityCheckOk, integrityWarning, setupAction, technicalCheckWarning } from '../integrityMessages'
import { isActiveStatus, listScoped, maybeSingleScoped, normalizeRecordStatus } from '../crossDomainConsistency'

export const companyIntegrityChecks = [
  check('company_active_for_official_operation', ['branch_opening', 'title_change', 'address_change', 'public_registration_update', 'nace_change', 'activity_subject_change', 'capital_increase'], 'blocking', async context => {
    const companyId = context.companyId || context.entityId || context.payload?.company_id
    if (!companyId) return integrityBlocking('company_active_for_official_operation', 'Resmi islem icin sirket secilmelidir.')
    const company = await maybeSingleScoped(context.supabase, context.tenantContext, 'companies', 'id,trade_name,record_status,company_status,status,is_deleted', { id: companyId })
    if (company.missingInfrastructure) return technicalCheckWarning('company_active_for_official_operation', 'companies', company.error)
    if (!company.data) return integrityBlocking('company_active_for_official_operation', 'Sirket kaydi bulunamadi.')
    if (!isActiveStatus(company.data)) {
      return integrityBlocking('company_active_for_official_operation', 'Bu islem yalnizca aktif sirketlerde yapilabilir.', {
        affectedEntities: [{ entityType: 'company', entityId: String(companyId), label: company.data.trade_name, status: String(company.data.record_status || company.data.company_status || company.data.status || '') }],
      })
    }
    return integrityCheckOk('company_active_for_official_operation')
  }),

  check('company_not_deregistered', ['title_change', 'address_change', 'public_registration_update', 'nace_change', 'activity_subject_change', 'capital_increase', 'company_liquidation', 'company_deregistration'], 'blocking', async context => {
    const companyId = context.companyId || context.entityId || context.payload?.company_id
    if (!companyId) return integrityCheckOk('company_not_deregistered')
    const company = await maybeSingleScoped(context.supabase, context.tenantContext, 'companies', 'id,trade_name,record_status,company_status,status,is_deleted', { id: companyId })
    if (company.missingInfrastructure) return technicalCheckWarning('company_not_deregistered', 'companies', company.error)
    if (normalizeRecordStatus(company.data?.record_status || company.data?.company_status || company.data?.status) === 'deregistered') {
      return integrityBlocking('company_not_deregistered', 'Terkin edilmis sirketlerde yeni resmi islem baslatilamaz.', {
        affectedEntities: [{ entityType: 'company', entityId: String(companyId), label: company.data?.trade_name, status: 'deregistered' }],
      })
    }
    return integrityCheckOk('company_not_deregistered')
  }),

  check('company_has_valid_current_ownership', ['capital_increase', 'ownership_exit', 'share_transfer', 'ownership_correction'], 'blocking', async context => {
    const companyId = context.companyId || context.entityId || context.payload?.company_id
    if (!companyId) return integrityCheckOk('company_has_valid_current_ownership')
    const ownership = await listScoped(context.supabase, context.tenantContext, 'v_current_ownership', 'partner_id,company_id,current_share_ratio,share_ratio,status,record_status', { company_id: companyId }, { limit: 200 })
    if (ownership.missingInfrastructure) {
      return integrityBlocking('company_has_valid_current_ownership', 'Sermaye ve ortaklik islemleri icin guncel ortaklik dagilimi hazir olmalidir.', {
        suggestedActions: [setupAction('partners')],
      })
    }
    const activeRows = ownership.data.filter(row => isActiveStatus(row) || Number(row.current_share_ratio ?? row.share_ratio ?? 0) > 0)
    if (!activeRows.length) {
      return integrityBlocking('company_has_valid_current_ownership', 'Sermaye ve ortaklik islemleri icin aktif ortaklik dagilimi bulunmalidir.', {
        suggestedActions: [{ label: 'Ortaklarimiz sayfasina git', targetPage: '/app/sirket/companies/partners' }],
      })
    }
    return integrityCheckOk('company_has_valid_current_ownership')
  }),

  check('company_has_valid_branch_summary', ['company_liquidation', 'company_deregistration'], 'warning', async context => {
    const companyId = context.companyId || context.entityId || context.payload?.company_id
    if (!companyId) return integrityCheckOk('company_has_valid_branch_summary')
    const branches = await listScoped(context.supabase, context.tenantContext, 'company_branches', 'id,branch_name,status,record_status,is_deleted', { company_id: companyId }, { limit: 50 })
    if (branches.missingInfrastructure) return integrityCheckOk('company_has_valid_branch_summary')
    const activeBranches = branches.data.filter(isActiveStatus)
    if (!activeBranches.length) return integrityCheckOk('company_has_valid_branch_summary')
    return integrityWarning('company_has_valid_branch_summary', 'Bu sirketin acik subeleri var; tasfiye veya terkin oncesinde sube etkilerini kontrol edin.', {
      affectedEntities: activeBranches.map(row => ({ entityType: 'company_branch', entityId: String(row.id), label: row.branch_name, status: row.record_status || row.status })),
      suggestedActions: [{ label: 'Subelerimiz sayfasina git', targetPage: '/app/sirket/companies/branches' }],
    })
  }),

  check('company_nace_consistency', ['nace_change', 'activity_subject_change'], 'warning', async context => {
    const companyId = context.companyId || context.entityId || context.payload?.company_id
    if (!companyId) return integrityCheckOk('company_nace_consistency')
    const naces = await listScoped(context.supabase, context.tenantContext, 'company_nace_codes', 'id,nace_code,is_primary,status,is_deleted', { company_id: companyId }, { limit: 50 })
    if (naces.missingInfrastructure) return integrityCheckOk('company_nace_consistency')
    if (!naces.data.some(row => row.is_primary && row.is_deleted !== true)) {
      return integrityWarning('company_nace_consistency', 'Sirket icin birincil NACE kodu gorunmuyor; faaliyet bilgilerini kontrol edin.', {
        suggestedActions: [{ label: 'NACE kodlarini guncelle', actionKey: 'nace_change', wizardKey: 'nace_change' }],
      })
    }
    return integrityCheckOk('company_nace_consistency')
  }),
] satisfies IntegrityCheckDefinition[]

function check(
  key: string,
  operationKeys: string[],
  severity: 'warning' | 'blocking',
  run: IntegrityCheckDefinition['run']
): IntegrityCheckDefinition {
  return {
    key,
    label: key,
    domain: 'company',
    moduleKey: 'companies',
    entityType: 'company',
    operationKeys,
    severity,
    run,
  }
}
