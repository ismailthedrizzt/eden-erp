import type { ReadModelProjection } from '../registry'

export const partnerListProjection: ReadModelProjection = {
  key: 'partnerList',
  name: 'Ortaklarimiz liste projection',
  version: 1,
  sources: ['company_partners', 'v_current_ownership', 'v_company_partner_list_projection'],
  fallbackQuery: 'company_partners',
  cacheDurationSeconds: 0,
  fields: ['id', 'company_id', 'display_name', 'record_status', 'current_share_ratio', 'updated_at'],
  refreshStrategy: 'outbox_invalidation',
}
