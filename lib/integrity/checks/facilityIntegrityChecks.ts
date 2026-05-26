import 'server-only'

import type { IntegrityCheckDefinition } from '../integrity.types'
import { integrityCheckOk, integrityWarning } from '../integrityMessages'
import { listScoped } from '../crossDomainConsistency'

export const facilityIntegrityChecks = [
  check('facility_same_company', ['branch_opening', 'branch_closing', 'representative_authority_scope_change'], 'blocking', async () =>
    integrityCheckOk('facility_same_company')
  ),
  check('facility_active_for_scope', ['representative_start', 'representative_authority_scope_change'], 'blocking', async () =>
    integrityCheckOk('facility_active_for_scope')
  ),
  check('facility_no_active_dependents_on_close', ['branch_closing'], 'warning', async context => {
    const facilityId = context.payload?.facility_id || context.facilityId
    if (!facilityId) return integrityCheckOk('facility_no_active_dependents_on_close')
    const rows = await listScoped(context.supabase, context.tenantContext, 'company_branches', 'id,branch_name,status,record_status,is_deleted', { facility_id: facilityId }, { limit: 25 })
    if (rows.missingInfrastructure || !rows.data.length) return integrityCheckOk('facility_no_active_dependents_on_close')
    return integrityWarning('facility_no_active_dependents_on_close', 'Bu tesis/lokasyona bagli aktif kayitlar olabilir; kapanis aksiyonunu kontrol edin.', {
      affectedEntities: rows.data.map(row => ({ entityType: 'company_branch', entityId: String(row.id), label: row.branch_name, status: row.record_status || row.status })),
      suggestedActions: [{ label: 'Tesisler/Lokasyonlar sayfasina git', targetPage: '/app/sirket/tesisler' }],
    })
  }),
  check('facility_branch_link_consistency', ['branch_opening'], 'warning', async () =>
    integrityCheckOk('facility_branch_link_consistency')
  ),
] satisfies IntegrityCheckDefinition[]

function check(
  key: string,
  operationKeys: string[],
  severity: 'warning' | 'blocking',
  run: IntegrityCheckDefinition['run']
): IntegrityCheckDefinition {
  return { key, label: key, domain: 'facility', moduleKey: 'facilities', entityType: 'facility', operationKeys, severity, run }
}
