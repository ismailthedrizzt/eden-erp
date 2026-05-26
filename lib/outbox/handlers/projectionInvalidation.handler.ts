import type { EventHandler } from './types'

export const projectionInvalidationHandler: EventHandler = {
  key: 'projectionInvalidation',
  handles: 'all',
  priority: 10,
  retryable: true,
  async handle(event, context) {
    const projectionKeys = context.contract?.projectionKeys || []
    if (!projectionKeys.length) return

    // Server-side projection cache invalidation will be wired here when a cache
    // backend is introduced. Keeping this handler idempotent makes events safe
    // to replay without affecting business data.
    void event
  },
}
