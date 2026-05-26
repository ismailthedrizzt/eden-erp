import type { UnifiedActionItem } from '@/lib/action-center/actionCenter.types'
import type { IntegritySummary } from './integrity.types'

export function integritySummaryToActionItems(summary: IntegritySummary, input: {
  tenantId: string
  companyId?: string | null
  branchId?: string | null
  moduleKey: string
  entityType?: string | null
  entityId?: string | null
  actionKey?: string | null
}): UnifiedActionItem[] {
  return summary.results
    .filter(result => !result.ok)
    .map(result => ({
      id: `integrity:${result.key}:${input.entityId || input.companyId || input.branchId || 'scope'}`,
      tenant_id: input.tenantId,
      company_id: input.companyId || null,
      branch_id: input.branchId || null,
      module_key: input.moduleKey,
      source_type: 'integrity_warning',
      source_id: result.key,
      title: result.severity === 'warning' ? 'Veri tutarliligi uyarisi var' : 'Islem oncesi duzeltilmesi gereken veri var',
      description: result.message,
      status: result.severity === 'warning' ? 'open' : 'failed',
      severity: result.severity === 'critical' || result.severity === 'blocking' ? 'error' : 'warning',
      priority: result.severity === 'critical' || result.severity === 'blocking' ? 'high' : 'normal',
      action_key: input.actionKey || null,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      record_label: result.affectedEntities[0]?.label || null,
      created_at: new Date().toISOString(),
      target_page: result.suggestedActions[0]?.targetPage || null,
      suggested_actions: result.suggestedActions.map(action => ({
        label: action.label,
        action_type: action.wizardKey ? 'open_wizard' : action.targetPage ? 'navigate' : 'dismiss',
        target_page: action.targetPage,
      })),
    }))
}
