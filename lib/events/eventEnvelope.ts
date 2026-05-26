import { randomUUID } from 'crypto'
import type { EventEnvelope } from './eventContract.types'
import { getEventContract } from './eventRegistry'
import { getEventVersion } from './eventVersioning'

export interface CreateEventEnvelopeInput {
  eventId?: string
  eventType: string
  eventVersion?: string | null
  tenantId: string
  companyId?: string | null
  aggregateType?: string | null
  aggregateId: string
  operationId?: string | null
  processInstanceId?: string | null
  causationId?: string | null
  correlationId?: string | null
  occurredAt?: string | null
  payload?: Record<string, any> | null
  metadata?: Record<string, any> | null
}

export function createEventEnvelope(input: CreateEventEnvelopeInput): EventEnvelope {
  const contract = getEventContract(input.eventType)
  return {
    event_id: input.eventId || randomUUID(),
    event_type: input.eventType,
    event_version: input.eventVersion || getEventVersion(input.eventType),
    tenant_id: input.tenantId,
    company_id: input.companyId || null,
    aggregate_type: input.aggregateType || contract?.aggregateType || 'system',
    aggregate_id: input.aggregateId,
    operation_id: input.operationId || null,
    process_instance_id: input.processInstanceId || null,
    causation_id: input.causationId || null,
    correlation_id: input.correlationId || null,
    occurred_at: input.occurredAt || new Date().toISOString(),
    payload: input.payload || {},
    metadata: input.metadata || {},
  }
}
