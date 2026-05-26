import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import { withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import type { TenantContext } from '@/lib/tenancy/server'
import { AuditLogService } from '@/lib/audit/auditLogService'
import type { AuditActionType } from '@/lib/audit/audit.types'
import type { ProcessEventType, ProcessInstance } from './process.types'

export async function recordProcessEvent({
  supabase,
  tenantContext,
  process,
  eventType,
  stepKey,
  oldStatus,
  newStatus,
  payload,
  createdBy,
  emitOutbox = true,
}: {
  supabase: SupabaseClient
  tenantContext: TenantContext
  process: Pick<ProcessInstance, 'id' | 'tenant_id' | 'company_id' | 'module_key'> & { operation_id?: string | null }
  eventType: ProcessEventType
  stepKey?: string | null
  oldStatus?: string | null
  newStatus?: string | null
  payload?: Record<string, any>
  createdBy?: string | null
  emitOutbox?: boolean
}) {
  const row = withTenantInsertScopeForTable({
    tenant_id: process.tenant_id || tenantContext.tenantId,
    process_instance_id: process.id,
    company_id: process.company_id || null,
    module_key: process.module_key,
    event_type: eventType,
    step_key: stepKey || null,
    old_status: oldStatus || null,
    new_status: newStatus || null,
    payload_json: payload || {},
    created_by: createdBy || null,
  }, 'process_events', tenantContext)

  const { error } = await supabase.from('process_events').insert(row)
  if (error && !isMissingInfrastructureError(error)) throw new Error(error.message)

  if (emitOutbox) {
    await new OutboxEventService(supabase).enqueue({
      tenantId: process.tenant_id || tenantContext.tenantId,
      companyId: process.company_id || null,
      eventType,
      aggregateId: String(payload?.task_id || payload?.approval_id || process.id),
      operationId: process.operation_id || null,
      processInstanceId: process.id,
      correlationId: process.id,
      payload: {
        ...(payload || {}),
        process_instance_id: process.id,
        process_module_key: process.module_key,
        step_key: stepKey || null,
        old_status: oldStatus || null,
        new_status: newStatus || null,
        created_by: createdBy || null,
      },
    }).catch(() => null)
  }

  await new AuditLogService(supabase, tenantContext).recordAudit({
    context: {
      tenantId: process.tenant_id || tenantContext.tenantId,
      companyId: process.company_id || null,
      moduleKey: process.module_key,
      processInstanceId: process.id,
      operationId: process.operation_id || null,
      userId: createdBy || null,
    },
    actionType: auditActionForProcessEvent(eventType),
    actionKey: eventType,
    resultStatus: eventType === 'process.failed' || eventType === 'process.rejected' || eventType === 'process.cancelled' ? 'failed' : 'success',
    severity: eventType === 'process.failed' ? 'error' : eventType === 'process.rejected' || eventType === 'process.cancelled' ? 'warning' : 'info',
    summary: processAuditSummary(eventType),
    reason: typeof payload?.reason === 'string' ? payload.reason : typeof payload?.note === 'string' ? payload.note : null,
    metadata: {
      step_key: stepKey || null,
      old_status: oldStatus || null,
      new_status: newStatus || null,
      payload: payload || {},
    },
  }).catch(() => null)

  return row
}

function auditActionForProcessEvent(eventType: ProcessEventType): AuditActionType {
  if (eventType === 'process.started') return 'process_start'
  if (eventType === 'process.step_completed') return 'process_step_complete'
  if (eventType === 'process.approved') return 'process_approve'
  if (eventType === 'process.rejected') return 'process_reject'
  if (eventType === 'process.cancelled') return 'process_cancel'
  return 'system_event'
}

function processAuditSummary(eventType: ProcessEventType) {
  if (eventType === 'process.started') return 'Surec baslatildi.'
  if (eventType === 'process.step_completed') return 'Surec adimi tamamlandi.'
  if (eventType === 'process.approved') return 'Surec onayi verildi.'
  if (eventType === 'process.rejected') return 'Surec onayi reddedildi.'
  if (eventType === 'process.cancelled') return 'Surec iptal edildi.'
  if (eventType === 'process.failed') return 'Surec basarisiz oldu.'
  return 'Surec olayi kaydedildi.'
}
