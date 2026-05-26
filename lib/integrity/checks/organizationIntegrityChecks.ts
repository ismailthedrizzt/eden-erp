import 'server-only'

import type { IntegrityCheckDefinition } from '../integrity.types'
import { integrityCheckOk, integrityWarning } from '../integrityMessages'
import { listScoped } from '../crossDomainConsistency'

export const organizationIntegrityChecks = [
  check('organization_unit_no_cycle', ['branch_opening', 'representative_authority_scope_change'], 'blocking', async () =>
    integrityCheckOk('organization_unit_no_cycle')
  ),
  check('organization_unit_same_company', ['branch_opening', 'representative_authority_scope_change'], 'blocking', async () =>
    integrityCheckOk('organization_unit_same_company')
  ),
  check('organization_unit_active_for_scope', ['representative_start', 'representative_authority_scope_change'], 'blocking', async () =>
    integrityCheckOk('organization_unit_active_for_scope')
  ),
  check('organization_unit_no_active_dependents_on_close', ['branch_closing'], 'warning', async context => {
    const unitId = context.payload?.organization_unit_id || context.organizationUnitId
    if (!unitId) return integrityCheckOk('organization_unit_no_active_dependents_on_close')
    const rows = await listScoped(context.supabase, context.tenantContext, 'organization_units', 'id,name,parent_id,status,active,is_deleted', { parent_id: unitId }, { limit: 25 })
    if (rows.missingInfrastructure || !rows.data.length) return integrityCheckOk('organization_unit_no_active_dependents_on_close')
    return integrityWarning('organization_unit_no_active_dependents_on_close', 'Bu organizasyon birimine bagli aktif alt kayitlar olabilir; kapanis aksiyonunu kontrol edin.', {
      affectedEntities: rows.data.map(row => ({ entityType: 'organization_unit', entityId: String(row.id), label: row.name, status: row.status })),
      suggestedActions: [{ label: 'Teskilat/Kadro sayfasina git', targetPage: '/app/sirket/teskilat' }],
    })
  }),
] satisfies IntegrityCheckDefinition[]

function check(
  key: string,
  operationKeys: string[],
  severity: 'warning' | 'blocking',
  run: IntegrityCheckDefinition['run']
): IntegrityCheckDefinition {
  return { key, label: key, domain: 'organization', moduleKey: 'organization', entityType: 'organization_unit', operationKeys, severity, run }
}
