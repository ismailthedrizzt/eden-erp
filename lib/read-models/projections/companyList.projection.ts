import type { ProjectionDefinition } from '../projection.types'

export const companyListProjection: ProjectionDefinition = {
  key: 'companyList',
  name: 'Sirketlerimiz liste projection',
  version: '2026-05-26.1',
  sourceName: 'v_company_list_projection',
  sourceType: 'view',
  sourceTables: ['companies'],
  defaultSort: 'short_name',
  defaultDirection: 'asc',
  fields: ['id', 'short_name', 'trade_name', 'record_status', 'company_status', 'updated_at'],
  searchableFields: ['short_name', 'trade_name', 'tax_number', 'city', 'district'],
  sortableFields: {
    short_name: 'short_name',
    trade_name: 'trade_name',
    record_status: 'record_status',
    company_status: 'company_status',
    updated_at: 'updated_at',
    created_at: 'created_at',
  },
  statusField: 'record_status',
  tenantScoped: true,
  cacheMs: 60_000,
  fallback: {
    type: 'query_builder',
    tableName: 'companies',
  },
}
