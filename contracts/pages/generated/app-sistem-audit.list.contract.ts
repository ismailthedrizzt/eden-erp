import type { EdenListContract } from '../../core/list.contract'

export const appSistemAuditListContract = {
  columns: [
    { key: 'id', label: 'ID', searchable: true },
  ],
  sortableFields: [],
  filterableFields: [],
  searchableFields: ['id'],
  rowActions: [],
  bulkActions: [],
  emptyState: {
    title: 'Kayit bulunamadi',
    message: 'Bu liste icin henuz kayit bulunmuyor.',
  },
  primaryActionLabel: 'Ekle',
  primaryActionBehavior: 'open_draft_form',
} as const satisfies EdenListContract
