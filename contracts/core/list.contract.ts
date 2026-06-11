export interface EdenListColumnContract {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  visible?: boolean
}

export interface EdenListContract {
  columns: readonly EdenListColumnContract[]
  sortableFields: readonly string[]
  filterableFields: readonly string[]
  searchableFields: readonly string[]
  rowActions: readonly string[]
  bulkActions: readonly string[]
  emptyState: {
    title: string
    message: string
  }
  primaryActionLabel: string
  primaryActionBehavior: 'open_draft_form' | 'open_lifecycle_wizard'
}
