import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

type DispatchOptions = {
  limit?: number
  lockedBy?: string
}

type DispatchResult = {
  processed: number
  completed: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

const EVENT_HANDLERS: Record<string, (event: Record<string, any>) => Promise<Record<string, any>>> = {
  'company.branch_opened': projectionInvalidationHandler(['branchList', 'companyDetail']),
  'company.branch_closed': projectionInvalidationHandler(['branchList', 'companyDetail']),
  'company.nace_changed': projectionInvalidationHandler(['companyDetail', 'companyList']),
  'representative.authority.updated': projectionInvalidationHandler(['representativeList']),
  'ownership.transaction.completed': projectionInvalidationHandler(['partnerList', 'companyDetail']),
}

export async function dispatchOutboxEvents(
  supabase: SupabaseClient,
  options: DispatchOptions = {}
): Promise<DispatchResult> {
  const limit = options.limit || 25
  const lockedBy = options.lockedBy || `outbox-dispatcher-${Date.now()}`
  const result: DispatchResult = { processed: 0, completed: 0, failed: 0, errors: [] }

  const { data: events, error } = await supabase
    .from('outbox_events')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    if (isMissingInfrastructureError(error)) return result
    throw error
  }

  for (const event of events || []) {
    result.processed += 1
    const locked = await lockOutboxEvent(supabase, event.id, lockedBy)
    if (!locked) continue

    try {
      const handler = EVENT_HANDLERS[event.event_type] || placeholderHandler
      const handlerResult = await handler(event)
      await markOutboxCompleted(supabase, event.id, handlerResult)
      result.completed += 1
    } catch (handlerError: any) {
      const message = handlerError?.message || 'Outbox event islenemedi.'
      await markOutboxFailed(supabase, event, message)
      result.failed += 1
      result.errors.push({ id: event.id, error: message })
    }
  }

  return result
}

async function lockOutboxEvent(supabase: SupabaseClient, id: string, lockedBy: string) {
  const { data, error } = await supabase
    .from('outbox_events')
    .update({
      status: 'processing',
      locked_at: new Date().toISOString(),
      locked_by: lockedBy,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  if (error) {
    if (isMissingInfrastructureError(error)) return null
    throw error
  }
  return data
}

async function markOutboxCompleted(supabase: SupabaseClient, id: string, handlerResult: Record<string, any>) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('outbox_events')
    .update({
      status: 'completed',
      processed_at: now,
      published_at: now,
      error_json: null,
      last_error: null,
      payload_json: handlerResult.payload_json,
    })
    .eq('id', id)
  if (error) throw error
}

async function markOutboxFailed(supabase: SupabaseClient, event: Record<string, any>, message: string) {
  const retryCount = Number(event.retry_count || 0) + 1
  const { error } = await supabase
    .from('outbox_events')
    .update({
      status: retryCount >= 5 ? 'failed' : 'pending',
      retry_count: retryCount,
      last_error: message,
      error_json: { message },
    })
    .eq('id', event.id)
  if (error) throw error
}

function projectionInvalidationHandler(projections: string[]) {
  return async (event: Record<string, any>) => ({
    payload_json: {
      ...(event.payload_json || {}),
      handled_by: 'projection_invalidation',
      invalidated_projections: projections,
      handled_at: new Date().toISOString(),
    },
  })
}

async function placeholderHandler(event: Record<string, any>) {
  return {
    payload_json: {
      ...(event.payload_json || {}),
      handled_by: 'placeholder',
      handled_at: new Date().toISOString(),
    },
  }
}
