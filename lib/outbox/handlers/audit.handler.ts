import type { EventHandler } from './types'
import { AuditLogService } from '@/lib/audit/auditLogService'

export const auditHandler: EventHandler = {
  key: 'audit',
  handles: 'all',
  priority: 30,
  retryable: false,
  async handle(event, context) {
    if (!context.contract?.auditRequired) return

    const result = await new AuditLogService(context.supabase).recordAudit({
      context: {
        tenantId: event.tenant_id,
        companyId: event.company_id || null,
        moduleKey: event.module_key || context.contract.moduleKey,
        entityType: event.aggregate_type,
        entityId: String(event.aggregate_id),
        operationId: event.operation_id || null,
        processInstanceId: event.process_instance_id || null,
        outboxEventId: event.id,
        userId: event.payload_json?.user_id || event.payload_json?.created_by || null,
      },
      actionType: 'system_event',
      actionKey: event.event_type,
      oldValues: event.payload_json?.old_values || null,
      newValues: event.payload_json?.new_values || event.payload_json || null,
      summary: `${event.event_type} olayi kaydedildi.`,
      metadata: {
        event_version: event.event_version || context.contract.version,
        handler_key: 'audit',
      },
    })
    if (!result.ok && result.code !== 'AUDIT_INFRASTRUCTURE_MISSING') {
      throw new Error(result.error || 'Audit handler kaydi yazamadi.')
    }
  },
}
