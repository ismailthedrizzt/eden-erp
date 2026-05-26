import type { OutboxEventRecord } from '@/lib/outbox/outboxEventService'
import type { EventHandler } from './types'
import { projectionInvalidationHandler } from './projectionInvalidation.handler'
import { notificationHandler } from './notification.handler'
import { auditHandler } from './audit.handler'
import { aiContextHandler } from './aiContext.handler'

const registeredHandlers: EventHandler[] = [
  projectionInvalidationHandler,
  notificationHandler,
  auditHandler,
  aiContextHandler,
]

export function registerHandler(handler: EventHandler) {
  const existingIndex = registeredHandlers.findIndex(item => item.key === handler.key)
  if (existingIndex >= 0) {
    registeredHandlers[existingIndex] = handler
  } else {
    registeredHandlers.push(handler)
  }
}

export function listHandlers() {
  return [...registeredHandlers].sort((a, b) => a.priority - b.priority)
}

export function getHandlersForEvent(event: Pick<OutboxEventRecord, 'event_type'>) {
  return listHandlers().filter(handler => handler.handles === 'all' || handler.handles.includes(event.event_type))
}
