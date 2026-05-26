import type { ReadModelProjection } from '../registry'

export const representativeListProjection: ReadModelProjection = {
  key: 'representativeList',
  name: 'Temsilcilerimiz liste projection',
  version: 1,
  sources: ['company_representatives', 'company_representative_authority_transactions', 'v_current_representative_authorities'],
  fallbackQuery: 'company_representatives + v_current_representative_authorities',
  cacheDurationSeconds: 0,
  fields: ['id', 'company_id', 'display_name', 'authority_status', 'scope_type', 'branch_id', 'organization_unit_id', 'facility_id', 'updated_at'],
  refreshStrategy: 'outbox_invalidation',
}
