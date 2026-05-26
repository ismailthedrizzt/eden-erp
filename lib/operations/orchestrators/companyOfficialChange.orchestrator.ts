import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { OperationRequestService } from '@/lib/operations/operationRequestService'
import type { OperationRequestRecord } from '@/lib/operations/types'
import { OutboxEventService } from '@/lib/outbox/outboxEventService'
import type { TenantContext } from '@/lib/tenancy/server'
import { duplicateOperationResult, orchestratorError, orchestratorSuccess } from './orchestratorResponse'
import type { OperationOrchestratorResult } from './types'

export async function createOfficialChangeOperation({
  supabase,
  tenantContext,
  companyId,
  entityType,
  entityId,
  operationType,
  clientRequestId,
  baseVersion,
  baseUpdatedAt,
  requestedBy,
  payload,
}: {
  supabase: SupabaseClient
  tenantContext: TenantContext
  companyId: string
  entityType: string
  entityId?: string | null
  operationType: string
  clientRequestId?: string | null
  baseVersion?: number | null
  baseUpdatedAt?: string | null
  requestedBy?: string | null
  payload: Record<string, any>
}): Promise<
  | { ok: true; operation: OperationRequestRecord | null; duplicate?: false; service: OperationRequestService }
  | { ok: true; duplicate: true; result: OperationOrchestratorResult; service: OperationRequestService }
  | { ok: false; result: OperationOrchestratorResult; service: OperationRequestService }
> {
  const service = new OperationRequestService(supabase)
  const operationCreate = await service.createOrGet({
    tenantId: tenantContext.tenantId,
    companyId,
    moduleKey: 'sirket',
    entityType,
    entityId: entityId || null,
    operationType,
    clientRequestId,
    baseVersion,
    baseUpdatedAt,
    requestedBy: requestedBy || null,
    payload,
  })

  if (operationCreate.ok && operationCreate.duplicate) {
    return { ok: true, duplicate: true, result: duplicateOperationResult(operationCreate.operation), service }
  }

  if (!operationCreate.ok && !operationCreate.missingInfrastructure) {
    return {
      ok: false,
      result: orchestratorError(operationCreate.error, operationCreate.code || 'OPERATION_REQUEST_FAILED', 500),
      service,
    }
  }

  const operation = operationCreate.ok ? operationCreate.operation : null
  if (operation) await service.markProcessing(operation.id)
  return { ok: true, operation, service }
}

export async function failOfficialChangeOperation({
  service,
  operation,
  message,
  code,
  status = 400,
  details,
}: {
  service: OperationRequestService
  operation?: OperationRequestRecord | null
  message: string
  code: string
  status?: number
  details?: any
}) {
  if (operation) await service.markFailed(operation.id, { code, message, details: details || {} })
  return orchestratorError(message, code, status, details, operation ? { id: operation.id, operation_status: 'failed' } : null)
}

export async function completeOfficialChangeOperation<TData>({
  service,
  operation,
  data,
  warnings,
}: {
  service: OperationRequestService
  operation?: OperationRequestRecord | null
  data: TData
  warnings?: string[]
}) {
  if (operation) await service.markCompleted(operation.id, data as Record<string, any>, warnings)
  return orchestratorSuccess(data, {
    operationId: operation?.id || null,
    operationStatus: operation ? 'completed' : null,
    warnings,
  })
}

export async function enqueueOfficialChangeOutbox({
  supabase,
  tenantContext,
  companyId,
  eventType,
  aggregateType,
  aggregateId,
  operation,
  payload,
}: {
  supabase: SupabaseClient
  tenantContext: TenantContext
  companyId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  operation?: OperationRequestRecord | null
  payload: Record<string, any>
}) {
  if (!operation) return null
  return new OutboxEventService(supabase).enqueue({
    tenantId: tenantContext.tenantId,
    companyId,
    moduleKey: 'sirket',
    eventType,
    aggregateType,
    aggregateId,
    operationId: operation.id,
    payload,
  }).catch(() => null)
}
