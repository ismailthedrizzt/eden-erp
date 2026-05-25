import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'

export interface OutboxEventInput {
  tenantId: string
  companyId?: string | null
  moduleKey: string
  eventType: string
  aggregateType: string
  aggregateId: string
  operationId?: string | null
  payload?: Record<string, any>
}

export class OutboxEventService {
  constructor(private readonly supabase: SupabaseClient) {}

  async enqueue(input: OutboxEventInput) {
    const { data, error } = await this.supabase
      .from('outbox_events')
      .insert({
        tenant_id: input.tenantId,
        company_id: input.companyId || null,
        module_key: input.moduleKey,
        event_type: input.eventType,
        aggregate_type: input.aggregateType,
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

