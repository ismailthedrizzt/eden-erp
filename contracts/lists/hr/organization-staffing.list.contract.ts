import type { EdenListColumnContract, EdenListContract } from '../../core/list.contract'

export type OrganizationStaffingListColumnContract = EdenListColumnContract & { width: number }

export const organizationStaffingListContract = {
  columns: [
    { key: 'title', label: 'Unvan', type: 'text', width: 220, sortable: true, searchable: true },
    { key: 'employee', label: 'Calisan', type: 'text', width: 180, searchable: true },
    { key: 'status', label: 'Durum', type: 'status', width: 120, sortable: true, filterable: true },
    { key: 'budget_amount', label: 'Butce', type: 'number', width: 140, sortable: true },
    { key: 'actions', label: '', type: 'custom', width: 90 },
  ],
  sortableFields: ['title', 'status', 'budget_amount'],
  filterableFields: ['status', 'unit_id', 'is_manager'],
  searchableFields: ['title', 'employee'],
  rowActions: ['open_position_requisition', 'open_more_actions'],
  bulkActions: [],
  emptyState: {
    title: 'Kadro bulunamadi',
    message: 'Secili organizasyon birimi icin norm kadro henuz tanimlanmamis.',
  },
  primaryActionLabel: 'Kadro Ekle',
  primaryActionBehavior: 'open_draft_form',
} as const satisfies EdenListContract & {
  columns: readonly OrganizationStaffingListColumnContract[]
}
