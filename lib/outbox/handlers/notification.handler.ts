import type { EventHandler } from './types'

export const notificationHandler: EventHandler = {
  key: 'notification',
  handles: 'all',
  priority: 20,
  retryable: true,
  async handle(event, context) {
    const notificationType = context.contract?.notificationType
      || (event.event_type === 'process.task_created' ? 'process_task_created' : null)
    if (!notificationType) return

    // Notification persistence is intentionally a no-op until the notification
    // model is promoted. Pending actions already read process_tasks directly.
  },
}
