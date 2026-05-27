// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: outbox
// TARGET_ENDPOINT: /api/v1/events/outbox
// NOTES: Outbox event production should move behind Python operation services.

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getEventContract, validateEventPayload } from '@/lib/events/eventRegistry'
import { getEventVersion } from '@/lib/events/eventVersioning'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

export interface OutboxEventInput {
  tenantId: string
  companyId?: string | null
  moduleKey?: string | null
  eventType: string
  eventVersion?: string | null
  aggregateType?: string | null
  aggregateId: string
  operationId?: string | null
  processInstanceId?: string | null
  causationId?: string | null
  correlationId?: string | null
  payload?: Record<string, any>
  metadata?: Record<string, any>
  maxRetries?: number | null
}

export interface OutboxEventRecord {
  id: string
  tenant_id: string
  company_id?: string | null
  module_key?: string | null
  event_type: string
  event_version?: string | null
  aggregate_type: string
  aggregate_id: string
  operation_id?: string | null
  process_instance_id?: string | null
  causation_id?: string | null
  correlation_id?: string | null
  payload_json?: Record<string, any> | null
  metadata_json?: Record<string, any> | null
  status: string
  retry_count?: number | null
  max_retries?: number | null
  last_error?: string | null
  locked_at?: string | null
  locked_by?: string | null
  occurred_at?: string | null
  processed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: any
}

export interface FetchPendingBatchOptions {
  batchSize?: number
  limit?: number
}

export interface ReleaseStaleLocksOptions {
  lockTtlSeconds?: number
}

export class OutboxEventService {
  constructor(private readonly supabase: SupabaseClient) {}

  async enqueue(input: OutboxEventInput) {
    if (!input.tenantId) throw withCode(new Error('Outbox event tenant_id olmadan olusturulamaz.'), 'OUTBOX_TENANT_REQUIRED')
    if (!input.eventType) throw withCode(new Error('Outbox event_type zorunludur.'), 'OUTBOX_EVENT_TYPE_REQUIRED')
    if (!input.aggregateId) throw withCode(new Error('Outbox event aggregate_id olmadan olusturulamaz.'), 'OUTBOX_AGGREGATE_REQUIRED')

    const contract = getEventContract(input.eventType)
    const validation = validateEventPayload(input.eventType, input.payload || {})
    const metadata = {
      ...(input.metadata || {}),
      ...(contract ? {} : { event_contract_missing: true }),
      ...(validation.ok ? {} : { payload_validation: { missing_fields: validation.missingFields } }),
      ...(validation.warnings.length ? { validation_warnings: validation.warnings } : {}),
    }

    const row = {
      tenant_id: input.tenantId,
      company_id: input.companyId || null,
      module_key: resolveModuleKey(input.moduleKey, contract?.moduleKey),
      event_type: input.eventType,
      event_version: input.eventVersion || getEventVersion(input.eventType),
      aggregate_type: input.aggregateType || contract?.aggregateType || 'system',
      aggregate_id: input.aggregateId,
      operation_id: input.operationId || null,
      process_instance_id: input.processInstanceId || null,
      causation_id: input.causationId || null,
      correlation_id: input.correlationId || null,
      payload_json: input.payload || {},
      metadata_json: metadata,
      status: 'pending',
      retry_count: 0,
      max_retries: input.maxRetries ?? 5,
      occurred_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('outbox_events')
      .insert(row)
      .select('*')
      .single()

    if (!error) return data
    if (!isMissingInfrastructureError(error)) throw error

    return this.enqueueLegacy(input, contract?.moduleKey || null, contract?.aggregateType || null)
  }

  async enqueueMany(events: OutboxEventInput[]) {
    const created: Array<OutboxEventRecord | null> = []
    for (const event of events) {
      created.push(await this.enqueue(event))
    }
    return created
  }

  async fetchPendingBatch(options: FetchPendingBatchOptions = {}) {
    const limit = Math.max(1, Math.min(options.batchSize || options.limit || 25, 100))
    const { data, error } = await this.supabase
      .from('outbox_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit * 2)

    if (error) {
      if (isMissingInfrastructureError(error)) return []
      throw error
    }

    return ((data || []) as OutboxEventRecord[])
      .filter(event => Number(event.retry_count || 0) < Number(event.max_retries || 5))
      .slice(0, limit)
  }

  async markProcessing(eventId: string, lockId: string) {
    const now = new Date().toISOString()
    const { data, error } = await this.supabase
      .from('outbox_events')
      .update({
        status: 'processing',
        locked_at: now,
        locked_by: lockId,
        updated_at: now,
      })
      .eq('id', eventId)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle()

    if (error) {
      if (isMissingInfrastructureError(error)) return null
      throw error
    }
    return data as OutboxEventRecord | null
  }

  async markCompleted(eventId: string) {
    const now = new Date().toISOString()
    const { error } = await this.supabase
      .from('outbox_events')
      .update({
        status: 'completed',
        processed_at: now,
        published_at: now,
        error_json: null,
        last_error: null,
        locked_at: null,
        locked_by: null,
        updated_at: now,
      })
      .eq('id', eventId)

    if (error) {
      if (isMissingInfrastructureError(error)) return null
      throw error
    }
    return { id: eventId, status: 'completed' }
  }

  async markFailed(eventId: string, error: unknown, retryable = true) {
    const message = error instanceof Error ? error.message : String(error || 'Outbox event islenemedi.')
    const { data: current, error: readError } = await this.supabase
      .from('outbox_events')
      .select('id,retry_count,max_retries')
      .eq('id', eventId)
      .maybeSingle()

    if (readError) {
      if (isMissingInfrastructureError(readError)) return null
      throw readError
    }

    const retryCount = Number((current as any)?.retry_count || 0) + 1
    const maxRetries = Number((current as any)?.max_retries || 5)
    const status = retryable && retryCount < maxRetries ? 'pending' : 'failed'
    const now = new Date().toISOString()
    const { error: updateError } = await this.supabase
      .from('outbox_events')
      .update({
        status,
        retry_count: retryCount,
        last_error: message,
        error_json: { message },
        processed_at: status === 'failed' ? now : null,
        locked_at: null,
        locked_by: null,
        updated_at: now,
      })
      .eq('id', eventId)

    if (updateError) {
      if (isMissingInfrastructureError(updateError)) return null
      throw updateError
    }
    return { id: eventId, status, retry_count: retryCount }
  }

  async markSkipped(eventId: string, reason: string) {
    const now = new Date().toISOString()
    const { error } = await this.supabase
      .from('outbox_events')
      .update({
        status: 'skipped',
        last_error: reason,
        processed_at: now,
        locked_at: null,
        locked_by: null,
        updated_at: now,
      })
      .eq('id', eventId)

    if (error) {
      if (isMissingInfrastructureError(error)) return null
      throw error
    }
    return { id: eventId, status: 'skipped' }
  }

  async releaseStaleLocks(options: ReleaseStaleLocksOptions = {}) {
    const lockTtlSeconds = Math.max(30, options.lockTtlSeconds || 300)
    const threshold = new Date(Date.now() - lockTtlSeconds * 1000).toISOString()
    const { data, error } = await this.supabase
      .from('outbox_events')
      .update({
        status: 'pending',
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'processing')
      .lt('locked_at', threshold)
      .select('id')

    if (error) {
      if (isMissingInfrastructureError(error)) return []
      throw error
    }
    return data || []
  }

  private async enqueueLegacy(input: OutboxEventInput, contractModuleKey: string | null, contractAggregateType: string | null) {
    const { data, error } = await this.supabase
      .from('outbox_events')
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId || null,
        module_key: resolveModuleKey(input.moduleKey, contractModuleKey),
        event_type: input.eventType,
        aggregate_type: input.aggregateType || contractAggregateType || 'system',
        aggregate_id: input.aggregateId,
        operation_id: input.operationId || null,
        payload_json: input.payload || {},
        status: 'pending',
      })
      .select('*')
      .single()

    if (error) {
      if (isMissingInfrastructureError(error)) return null
      throw error
    }
    return data
  }
}

function withCode<T extends Error>(error: T, code: string) {
  ;(error as T & { code?: string }).code = code
  return error
}

function resolveModuleKey(inputModuleKey?: string | null, contractModuleKey?: string | null) {
  if (!inputModuleKey || inputModuleKey === 'sirket') return contractModuleKey || inputModuleKey || 'system'
  return inputModuleKey
}
