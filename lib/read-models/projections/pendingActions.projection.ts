import type { ProjectionDefinition } from '../projection.types'

export const pendingActionsProjection: ProjectionDefinition = {
  key: 'pendingActions',
  name: 'Bekleyen aksiyon projection',
  version: '2026-05-26.1',
  sourceName: 'operation_requests',
  sourceType: 'table',
  sourceTables: ['operation_requests', 'outbox_events'],
  defaultSort: 'created_at',
  defaultDirection: 'desc',
  fields: ['id', 'operation_type', 'operation_status', 'entity_type', 'entity_id', 'created_at'],
  searchableFields: ['operation_type', 'entity_type', 'entity_id'],
  sortableFields: {
    operation_type: 'operation_type',
    operation_status: 'operation_status',
    entity_type: 'entity_type',
    created_at: 'created_at',
  },
  statusField: 'operation_status',
  tenantScoped: true,
  cacheMs: 30_000,
  fallback: {
    type: 'query_builder',
    tableName: 'operation_requests',
  },
}
