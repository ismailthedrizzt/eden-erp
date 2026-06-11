import type { EdenListColumnContract, EdenListContract } from '../../core/list.contract'

export type ThemeManagementFilter = 'all' | 'active' | 'draft' | 'inactive' | 'invalid'
export type ThemeManagementListColumnContract = EdenListColumnContract & { width?: number }

export const themeManagementFilters: { id: ThemeManagementFilter; label: string }[] = [
  { id: 'all', label: 'Tumu' },
  { id: 'active', label: 'Aktif' },
  { id: 'draft', label: 'Taslak' },
  { id: 'inactive', label: 'Pasif' },
  { id: 'invalid', label: 'Hata' },
]

export const themeManagementListContract = {
  columns: [
    { key: 'displayName', label: 'Tema adi', width: 260, searchable: true, sortable: true },
    { key: 'themeKey', label: 'Tema kodu / slug', width: 220, searchable: true, sortable: true },
    { key: 'status', label: 'Durum', width: 120, filterable: true },
    { key: 'version', label: 'Versiyon', width: 110 },
    { key: 'isActive', label: 'Aktif tema mi?', width: 130, filterable: true },
    { key: 'updatedAt', label: 'Son guncelleme', width: 160, sortable: true },
  ],
  sortableFields: ['displayName', 'themeKey', 'updatedAt'],
  filterableFields: ['status', 'isActive', 'source'],
  searchableFields: ['displayName', 'themeKey'],
  rowActions: ['open_form'],
  bulkActions: [],
  emptyState: {
    title: 'Tema kaydi bulunamadi',
    message: 'Tema taslagi olusturmak icin Ekle aksiyonunu kullanin.',
  },
  primaryActionLabel: 'Ekle',
  primaryActionBehavior: 'open_draft_form',
  filters: themeManagementFilters,
} as const satisfies EdenListContract & {
  columns: readonly ThemeManagementListColumnContract[]
  filters: readonly { id: ThemeManagementFilter; label: string }[]
}
