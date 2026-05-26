import type { EventHandler } from './types'

export const aiContextHandler: EventHandler = {
  key: 'aiContext',
  handles: 'all',
  priority: 40,
  retryable: true,
  async handle(_event, context) {
    if (!context.contract?.aiContextRelevant) return

    // AI context refresh will be connected to an index/queue later. The
    // dispatcher already records the handler run, so this stays replay-safe.
  },
}
