import type { EdenListColumnContract, EdenListContract } from '../../core/list.contract'

export type ContractTypeListColumnContract = EdenListColumnContract & { width: number }

export const contractTypesListContract = {
  columns: [
    { key: 'label', label: 'Sozlesme Turu', type: 'text', width: 260, sortable: true, searchable: true },
    { key: 'key', label: 'Kod', type: 'text', width: 220, sortable: true, searchable: true },
  ],
  rows: [
    { key: 'sales_contract', label: 'Satis Sozlesmesi' },
    { key: 'purchase_contract', label: 'Satin Alma Sozlesmesi' },
    { key: 'supplier_contract', label: 'Tedarikci Sozlesmesi' },
    { key: 'service_contract', label: 'Hizmet Sozlesmesi' },
    { key: 'maintenance_contract', label: 'Bakim Sozlesmesi' },
    { key: 'warranty_extension_contract', label: 'Garanti Uzatma Sozlesmesi' },
    { key: 'project_contract', label: 'Proje Sozlesmesi' },
    { key: 'employment_contract', label: 'Is Sozlesmesi' },
    { key: 'lease_contract', label: 'Kira Sozlesmesi' },
    { key: 'nda', label: 'Gizlilik Sozlesmesi' },
    { key: 'partnership_contract', label: 'Is Ortakligi Sozlesmesi' },
    { key: 'dealer_contract', label: 'Bayilik Sozlesmesi' },
    { key: 'framework_agreement', label: 'Cerceve Sozlesme' },
    { key: 'other', label: 'Diger' },
  ],
  sortableFields: ['label', 'key'],
  filterableFields: [],
  searchableFields: ['label', 'key'],
  rowActions: ['view_registry_definition'],
  bulkActions: [],
  emptyState: {
    title: 'Sozlesme turu bulunamadi',
    message: 'Contract type registry bos olmamalidir.',
  },
  primaryActionLabel: 'Registry Goruntule',
  primaryActionBehavior: 'open_draft_form',
} as const satisfies EdenListContract & {
  columns: readonly ContractTypeListColumnContract[]
  rows: readonly { key: string; label: string }[]
}
