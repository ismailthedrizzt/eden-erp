export type EventAggregateType =
  | 'company'
  | 'company_branch'
  | 'company_partner'
  | 'company_representative'
  | 'ownership_transaction'
  | 'representative_authority_transaction'
  | 'process_instance'
  | 'process_task'
  | 'process_approval'
  | 'system'
  | string

export interface EventContract {
  eventType: string
  version: string
  moduleKey: string
  domain: string
  aggregateType: EventAggregateType
  description?: string
  payloadSchema?: any
  requiredFields?: string[]
  projectionKeys?: string[]
  notificationType?: string
  auditRequired?: boolean
  aiContextRelevant?: boolean
  deprecated?: boolean
}

export interface EventEnvelope {
  event_id: string
  event_type: string
  event_version: string
  tenant_id: string
  company_id?: string | null
  aggregate_type: string
  aggregate_id: string
  operation_id?: string | null
  process_instance_id?: string | null
  causation_id?: string | null
  correlation_id?: string | null
  occurred_at: string
  payload: Record<string, any>
  metadata?: Record<string, any>
}

export interface EventPayloadValidationResult {
  ok: boolean
  eventType: string
  missingFields: string[]
  warnings: string[]
}
