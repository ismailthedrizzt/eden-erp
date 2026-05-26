import type { EventHandler } from './types'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

export const auditHandler: EventHandler = {
  key: 'audit',
  handles: 'all',
  priority: 30,
  retryable: false,
  async handle(event, context) {
    if (!context.contract?.auditRequired) return

    const { error } = await context.supabase
      .from('audit_logs')
      .insert({
        instance_id: event.tenant_id,
        user_id: event.payload_json?.user_id || event.payload_json?.created_by || null,
        module_code: event.module_key || context.contract.moduleKey,
        resource: event.aggregate_type,
        record_id: String(event.aggregate_id),
        action: event.event_type,
        before_json: event.payload_json?.old_values || null,
        after_json: event.payload_json?.new_values || event.payload_json || null,
        metadata_json: {
          outbox_event_id: event.id,
          operation_id: event.operation_id || null,
          process_instance_id: event.process_instance_id || null,
          event_version: event.event_version || context.contract.version,
        },
      })

    if (error && !isMissingInfrastructureError(error)) throw error
  },
}
