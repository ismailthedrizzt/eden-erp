import type { ReadModelProjection } from '../registry'

export const pendingActionsProjection: ReadModelProjection = {
  key: 'pendingActions',
  name: 'Bekleyen aksiyon projection',
  version: 1,
  sources: ['operation_requests', 'outbox_events'],
  fallbackQuery: 'operation_requests',
  cacheDurationSeconds: 0,
  fields: ['id', 'operation_type', 'operation_status', 'entity_type', 'entity_id', 'created_at'],
  refreshStrategy: 'scheduled',
}
