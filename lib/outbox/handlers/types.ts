import type { SupabaseClient } from '@supabase/supabase-js'
import type { EventContract } from '@/lib/events/eventContract.types'
import type { OutboxEventRecord } from '@/lib/outbox/outboxEventService'

export interface EventHandlerContext {
  supabase: SupabaseClient
  contract: EventContract | null
  lockId: string
}

export interface EventHandler {
  key: string
  handles: string[] | 'all'
  priority: number
  retryable: boolean
  handle(event: OutboxEventRecord, context: EventHandlerContext): Promise<void>
}
