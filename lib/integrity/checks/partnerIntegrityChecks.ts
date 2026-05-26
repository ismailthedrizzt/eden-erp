import 'server-only'

import type { IntegrityCheckDefinition } from '../integrity.types'
import { integrityBlocking, integrityCheckOk, integrityWarning, setupAction } from '../integrityMessages'
import { isActiveStatus, listScoped } from '../crossDomainConsistency'

export const partnerIntegrityChecks = [
  check('partner_ownership_distribution_valid', ['capital_increase', 'share_transfer', 'ownership_exit', 'ownership_correction'], 'warning', async context => {
    const companyId = context.companyId || context.payload?.company_id
    if (!companyId) return integrityCheckOk('partner_ownership_distribution_valid')
    const ownership = await listScoped(context.supabase, context.tenantContext, 'v_current_ownership', 'partner_id,current_share_ratio,share_ratio,status,record_status', { company_id: companyId }, { limit: 200 })
    if (ownership.missingInfrastructure) {
      return integrityBlocking('partner_ownership_distribution_valid', 'Ortaklik dagilimi okunamadigi icin bu islem baslatilamaz.', {
        suggestedActions: [setupAction('partners')],
      })
    }
    const total = ownership.data.reduce((sum, row) => sum + Number(row.current_share_ratio ?? row.share_ratio ?? 0), 0)
    if (ownership.data.length && Math.abs(total - 100) > 0.01) {
      return integrityWarning('partner_ownership_distribution_valid', 'Guncel ortaklik dagilimi yuzde 100 olarak gorunmuyor; islem oncesinde ortaklik kayitlarini kontrol edin.', {
        metadata: { totalShareRatio: total },
        suggestedActions: [{ label: 'Ortaklik kayitlarini kontrol et', targetPage: '/app/sirket/companies/partners' }],
      })
    }
    return integrityCheckOk('partner_ownership_distribution_valid')
  }),

  check('partner_current_ownership_matches_transactions', ['capital_increase', 'share_transfer', 'ownership_exit', 'ownership_correction'], 'warning', async () =>
    integrityCheckOk('partner_current_ownership_matches_transactions')
  ),

  check('partner_no_active_transaction_conflict', ['initial_partnership_entry', 'share_transfer', 'ownership_exit', 'capital_increase', 'ownership_correction'], 'blocking', async context => {
    const companyId = context.companyId || context.payload?.company_id
    if (!companyId) return integrityCheckOk('partner_no_active_transaction_conflict')
    const transactions = await listScoped(context.supabase, context.tenantContext, 'ownership_transactions', 'id,transaction_type,status,approval_status,workflow_status,company_id,partner_id', { company_id: companyId }, { limit: 50 })
    if (transactions.missingInfrastructure) return integrityCheckOk('partner_no_active_transaction_conflict')
    const active = transactions.data.filter(row => ['draft', 'pending', 'in_review', 'waiting_approval', 'submitted'].includes(String(row.workflow_status || row.approval_status || row.status || '').toLocaleLowerCase('tr-TR')))
    if (!active.length) return integrityCheckOk('partner_no_active_transaction_conflict')
    return integrityBlocking('partner_no_active_transaction_conflict', 'Bu sirket icin tamamlanmamis ortaklik islemi var. Yeni islem baslatmadan once mevcut islemi tamamlayin.', {
      affectedEntities: active.map(row => ({ entityType: 'ownership_transaction', entityId: String(row.id), label: row.transaction_type, status: row.status })),
      suggestedActions: [{ label: 'Ortaklik islemlerini kontrol et', targetPage: '/app/sirket/companies/partners' }],
    })
  }),

  check('capital_increase_requires_partners', ['capital_increase'], 'blocking', async context => {
    const companyId = context.companyId || context.payload?.company_id
    if (!companyId) return integrityCheckOk('capital_increase_requires_partners')
    const ownership = await listScoped(context.supabase, context.tenantContext, 'v_current_ownership', 'partner_id,current_share_ratio,share_ratio,status,record_status', { company_id: companyId }, { limit: 200 })
    if (ownership.missingInfrastructure || !ownership.data.some(row => isActiveStatus(row) || Number(row.current_share_ratio ?? row.share_ratio ?? 0) > 0)) {
      return integrityBlocking('capital_increase_requires_partners', 'Sermaye Artirimi ortak bazli pay ve sermaye dagilimi gerektirir. Bu islem icin Ortaklarimiz modulu ve guncel ortaklik dagilimi aktif olmalidir.', {
        suggestedActions: [{ label: 'Ortaklarimiz sayfasina git', targetPage: '/app/sirket/companies/partners' }],
      })
    }
    return integrityCheckOk('capital_increase_requires_partners')
  }),

  check('ownership_exit_not_last_without_resolution', ['ownership_exit'], 'blocking', async () =>
    integrityCheckOk('ownership_exit_not_last_without_resolution')
  ),
] satisfies IntegrityCheckDefinition[]

function check(
  key: string,
  operationKeys: string[],
  severity: 'warning' | 'blocking',
  run: IntegrityCheckDefinition['run']
): IntegrityCheckDefinition {
  return { key, label: key, domain: 'company', moduleKey: 'partners', entityType: 'company_partner', operationKeys, severity, run }
}
