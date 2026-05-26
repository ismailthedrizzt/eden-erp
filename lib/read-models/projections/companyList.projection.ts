import type { ReadModelProjection } from '../registry'

export const companyListProjection: ReadModelProjection = {
  key: 'companyList',
  name: 'Sirketlerimiz liste projection',
  version: 1,
  sources: ['companies', 'v_company_list_projection'],
  fallbackQuery: 'companies',
  cacheDurationSeconds: 0,
  fields: ['id', 'short_name', 'trade_name', 'record_status', 'company_status', 'updated_at'],
  refreshStrategy: 'outbox_invalidation',
}
