export type ProjectionSourceType = 'table' | 'view' | 'materialized_view' | 'optimized_select'

export interface ListProjectionConfig {
  key: string
  moduleKey: string
  entityType: string
  sourceName: string
  sourceType: ProjectionSourceType
  version: string
  defaultColumns: string[]
  searchableFields?: string[]
  sortableFields?: Record<string, string>
  defaultSort?: string
  tenantScopeTable?: string
  companyScopeField?: string
  statusField?: string
  passiveValue?: unknown
  description?: string
}

const registry = new Map<string, ListProjectionConfig>()

export function registerListProjection(config: ListProjectionConfig) {
  registry.set(config.key, config)
  return config
}

export function getListProjection(key: string) {
  return registry.get(key)
}

export function listProjectionSelect(config: Pick<ListProjectionConfig, 'defaultColumns'>) {
  return config.defaultColumns.join(',')
}

export function listProjectionInfo(config: Pick<ListProjectionConfig, 'sourceName' | 'version'>) {
  return {
    name: config.sourceName,
    version: config.version,
  }
}

