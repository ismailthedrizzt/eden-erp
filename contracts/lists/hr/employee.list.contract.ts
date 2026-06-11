import type { EdenListColumnContract, EdenListContract } from '../../core/list.contract'

export type EmployeeListColumnContract = EdenListColumnContract & {
  type: 'text' | 'date'
  width: number
}

export const employeeListContract = {
  columns: [
    { key: 'employment_badge', label: 'Durum', type: 'text', width: 135, filterable: true },
    { key: 'employee_no', label: 'Calisan No', type: 'text', width: 125, sortable: true, searchable: true },
    { key: 'full_name', label: 'Ad Soyad', type: 'text', width: 220, sortable: true, searchable: true },
    { key: 'company_label', label: 'Bagli Sirket', type: 'text', width: 190, filterable: true },
    { key: 'branch_label', label: 'Sube', type: 'text', width: 150, filterable: true },
    { key: 'unit_label', label: 'Organizasyon Birimi', type: 'text', width: 190, filterable: true },
    { key: 'position_label', label: 'Pozisyon', type: 'text', width: 170, filterable: true },
    { key: 'employment_type_label', label: 'Istihdam Turu', type: 'text', width: 140, filterable: true },
    { key: 'start_date', label: 'Ise Giris', type: 'date', width: 120, sortable: true },
    { key: 'sgk_badge', label: 'SGK Durumu', type: 'text', width: 130, filterable: true },
    { key: 'phone', label: 'Telefon', type: 'text', width: 135, searchable: true },
    { key: 'email', label: 'E-posta', type: 'text', width: 190, searchable: true },
    { key: 'education_level', label: 'Egitim', type: 'text', width: 130 },
    { key: 'gender_label', label: 'Cinsiyet', type: 'text', width: 110, filterable: true },
    { key: 'updated_at', label: 'Son Guncelleme', type: 'date', width: 145, sortable: true },
  ],
  widgets: [
    { key: 'total', label: 'Toplam Calisan', source: 'summary.total_employees' },
    { key: 'active', label: 'Aktif', source: 'summary.active_employees' },
    { key: 'draft', label: 'Taslak Kart', source: 'summary.draft_employees' },
    { key: 'terminated', label: 'Isten Ayrilan', source: 'summary.terminated_employees' },
    { key: 'sgk', label: 'SGK Bekleyen', source: 'summary.pending_sgk' },
  ],
  sortableFields: ['employee_no', 'full_name', 'start_date', 'updated_at'],
  filterableFields: ['employment_status', 'sgk_status', 'company_id', 'branch_id', 'organization_unit_id', 'position_id'],
  searchableFields: ['employee_no', 'full_name', 'phone', 'email'],
  rowActions: ['view_detail', 'start_employment', 'assignment_change', 'terminate_employment', 'sgk_entry_completed', 'sgk_exit_completed', 'document_upload'],
  bulkActions: [],
  emptyState: {
    title: 'Henuz calisan kaydi yok',
    message: 'Calisan karti taslagi olusturmak icin Calisan Ekle aksiyonunu kullanin.',
  },
  primaryActionLabel: 'Calisan Ekle',
  primaryActionBehavior: 'open_draft_form',
} as const satisfies EdenListContract & {
  columns: readonly EmployeeListColumnContract[]
  widgets: readonly { key: string; label: string; source: string }[]
}
