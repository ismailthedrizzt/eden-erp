// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: outbox
// TARGET_FASTAPI_ENDPOINT: python-worker:outbox-dispatch
// NOTES: Dispatcher should move to Python background worker infrastructure.

import 'server-only'

import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getEventContract } from '@/lib/events/eventRegistry'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { AuditLogService } from '@/lib/audit/auditLogService'
import { getHandlersForEvent } from './handlers/handlerRegistry'
import type { EventHandler } from './handlers/types'
import { OutboxEventService, type OutboxEventRecord } from './outboxEventService'

export interface DispatchPendingEventsOptions {
  batchSize?: number
  limit?: number
  maxRuntimeMs?: number
  lockTtlSeconds?: number
  handlerFilter?: string[]
  lockedBy?: string
}

export interface DispatchPendingEventsResult {
  processed: number
  completed: number
  failed: number
  retried: number
  skipped: number
  durationMs: number
  errors: Array<{ id: string; error: string }>
}

export async function dispatchPendingEvents(
  supabase: SupabaseClient,
  options: DispatchPendingEventsOptions = {}
): Promise<DispatchPendingEventsResult> {
  const startedAt = Date.now()
  const maxRuntimeMs = Math.max(1000, options.maxRuntimeMs || 25000)
  const lockId = options.lockedBy || createLockId()
  const service = new OutboxEventService(supabase)
  const result: DispatchPendingEventsResult = {
    processed: 0,
    completed: 0,
    failed: 0,
    retried: 0,
    skipped: 0,
    durationMs: 0,
    errors: [],
  }

  await releaseStaleEventLocks(supabase, { lockTtlSeconds: options.lockTtlSeconds })
  const events = await service.fetchPendingBatch({ batchSize: options.batchSize || options.limit || 25 })

  for (const event of events) {
    if (Date.now() - startedAt > maxRuntimeMs) break
    result.processed += 1

    const lockedEvent = await service.markProcessing(event.id, lockId)
    if (!lockedEvent) continue

    try {
      const dispatchResult = await dispatchEvent(supabase, lockedEvent, {
        lockId,
        handlerFilter: options.handlerFilter,
      })

      if (dispatchResult === 'skipped') {
        await service.markSkipped(lockedEvent.id, 'Event contract bulunamadigi icin islenmedi.')
        await recordOutboxAudit(supabase, lockedEvent, 'skipped', 'Event contract bulunamadigi icin islenmedi.')
        result.skipped += 1
      } else {
        await service.markCompleted(lockedEvent.id)
        result.completed += 1
      }
    } catch (error: any) {
      const retryable = error?.retryable !== false
      const failed = await service.markFailed(lockedEvent.id, error, retryable)
      await recordOutboxAudit(supabase, lockedEvent, 'failed', error?.message || 'Outbox event islenemedi.')
      if (failed?.status === 'pending') result.retried += 1
      else result.failed += 1
      result.errors.push({ id: lockedEvent.id, error: error?.message || 'Outbox event islenemedi.' })
    }
  }

  result.durationMs = Date.now() - startedAt
  return result
}

async function recordOutboxAudit(
  supabase: SupabaseClient,
  event: OutboxEventRecord,
  status: 'failed' | 'skipped',
  reason: string
) {
  await new AuditLogService(supabase).recordAudit({
    context: {
      tenantId: event.tenant_id,
      companyId: event.company_id || null,
      moduleKey: event.module_key || null,
      entityType: event.aggregate_type,
      entityId: String(event.aggregate_id),
      operationId: event.operation_id || null,
      processInstanceId: event.process_instance_id || null,
      outboxEventId: event.id,
    },
    actionType: 'system_event',
    actionKey: `outbox_${status}`,
    resultStatus: status === 'failed' ? 'failed' : 'denied',
    severity: status === 'failed' ? 'error' : 'warning',
    reason,
    summary: status === 'failed' ? 'Outbox olayi islenemedi.' : 'Outbox olayi atlandi.',
    metadata: {
      event_type: event.event_type,
      retry_count: event.retry_count,
      status,
    },
  }).catch(() => null)
}

export async function dispatchEvent(
  supabase: SupabaseClient,
  event: OutboxEventRecord,
  options: { lockId?: string; handlerFilter?: string[] } = {}
) {
  const contract = getEventContract(event.event_type)
  if (!contract) return 'skipped' as const

  const handlers = resolveEventHandlers(event)
    .filter(handler => !options.handlerFilter?.length || options.handlerFilter.includes(handler.key))

  for (const handler of handlers) {
    await handleEventWithRetry(supabase, event, handler, {
      contract,
      lockId: options.lockId || createLockId(),
    })
  }

  return 'completed' as const
}

export function resolveEventHandlers(event: OutboxEventRecord) {
  return getHandlersForEvent(event)
}

export async function handleEventWithRetry(
  supabase: SupabaseClient,
  event: OutboxEventRecord,
  handler: EventHandler,
  context: { contract: NonNullable<ReturnType<typeof getEventContract>>; lockId: string }
) {
  const alreadyCompleted = await isHandlerCompleted(supabase, event.id, handler.key)
  if (alreadyCompleted) return

  await markHandlerRunStarted(supabase, event, handler.key)
  try {
    await handler.handle(event, {
      supabase,
      contract: context.contract,
      lockId: context.lockId,
    })
    await markHandlerRunCompleted(supabase, event.id, handler.key)
  } catch (error: any) {
    await markHandlerRunFailed(supabase, event.id, handler.key, error?.message || 'Handler islenemedi.')
    const wrappedError = error instanceof Error ? error : new Error(String(error || 'Handler islenemedi.'))
    ;(wrappedError as Error & { retryable?: boolean }).retryable = handler.retryable
    throw wrappedError
  }
}

export async function releaseStaleEventLocks(
  supabase: SupabaseClient,
  options: { lockTtlSeconds?: number } = {}
) {
  return new OutboxEventService(supabase).releaseStaleLocks(options)
}

export function createLockId() {
  return `outbox-dispatcher-${randomUUID()}`
}

export async function dispatchOutboxEvents(
  supabase: SupabaseClient,
  options: DispatchPendingEventsOptions = {}
) {
  return dispatchPendingEvents(supabase, options)
}

async function isHandlerCompleted(supabase: SupabaseClient, eventId: string, handlerKey: string) {
  const { data, error } = await supabase
    .from('outbox_event_handler_runs')
    .select('id,status')
    .eq('event_id', eventId)
    .eq('handler_key', handlerKey)
    .eq('status', 'completed')
    .maybeSingle()

  if (error) {
    if (isMissingInfrastructureError(error)) return false
    throw error
  }
  return !!data
}

async function markHandlerRunStarted(supabase: SupabaseClient, event: OutboxEventRecord, handlerKey: string) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('outbox_event_handler_runs')
    .upsert({
      tenant_id: event.tenant_id,
      event_id: event.id,
      handler_key: handlerKey,
      status: 'processing',
      error: null,
      started_at: now,
      updated_at: now,
    }, { onConflict: 'event_id,handler_key' })

  if (error && !isMissingInfrastructureError(error)) throw error
}

async function markHandlerRunCompleted(supabase: SupabaseClient, eventId: string, handlerKey: string) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('outbox_event_handler_runs')
    .update({
      status: 'completed',
      error: null,
      completed_at: now,
      updated_at: now,
    })
    .eq('event_id', eventId)
    .eq('handler_key', handlerKey)

  if (error && !isMissingInfrastructureError(error)) throw error
}

async function markHandlerRunFailed(supabase: SupabaseClient, eventId: string, handlerKey: string, message: string) {
  const { error } = await supabase
    .from('outbox_event_handler_runs')
    .update({
      status: 'failed',
      error: message,
      updated_at: new Date().toISOString(),
    })
    .eq('event_id', eventId)
    .eq('handler_key', handlerKey)

  if (error && !isMissingInfrastructureError(error)) throw error
}
