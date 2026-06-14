import type { EdenPageContract } from '../../core/page.contract'
import { organizationStaffingListContract } from '../../lists/hr/organization-staffing.list.contract'

export const organizationStaffingPageContract = {
  route: '/app/ik/teskilat',
  pageKind: 'list',
  owningEntity: 'organization_staffing',
  allowedActions: ['view_organization_tree', 'select_unit', 'view_staffing_positions', 'open_position_requisition'],
  requiredComponents: ['OrganizationTree', 'StaffingTabs', 'StaffingPositionTable', 'StaffingStats'],
  requiredStates: { empty: true, loading: true, error: false },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  list: organizationStaffingListContract,
  dashboard: {
    title: 'Teskilat & Norm Kadro',
    treePanelTitle: 'Teskilat Yapisi',
    addRootUnitLabel: 'Sirket',
    addPositionLabel: 'Kadro Ekle',
    openPositionLabel: 'Ilan Ac',
    moreActionsLabel: '...',
    selectUnitEmptyState: 'Sol taraftan bir birim secin',
    emptyPositionsState: 'Bu birimde kadro tanimlanmamis',
    positionSummaryLabels: {
      total: 'Kadro',
      filled: 'Dolu',
      open: 'Acik',
    },
    tabs: [
      { id: 'kadro', label: 'Norm Kadro' },
      { id: 'istatistik', label: 'Kadro Istatistikleri' },
      { id: 'gender', label: 'Cinsiyet & Engelli' },
      { id: 'butce', label: 'Butce Durumu' },
    ],
    statCards: [
      { key: 'total_positions', label: 'Toplam Kadro', tone: 'neutral' },
      { key: 'filled_positions', label: 'Dolu', tone: 'success' },
      { key: 'open_positions', label: 'Acik', tone: 'danger' },
      { key: 'filled_budget', label: 'Dolu Kadro Butce', tone: 'neutral' },
      { key: 'fill_rate', label: 'Doluluk Orani', tone: 'success' },
      { key: 'unit_count', label: 'Birim Sayisi', tone: 'info' },
    ],
    budgetCards: [
      { key: 'approved_budget', label: 'Onayli Butce', tone: 'neutral' },
      { key: 'used_budget', label: 'Kullanilan', tone: 'danger' },
      { key: 'open_budget', label: 'Acik Kadro Butce', tone: 'success' },
    ],
  },
  apiContractPath: 'contracts/api/hr/employee.api.contract.ts',
} as const satisfies EdenPageContract & {
  dashboard: {
    title: string
    treePanelTitle: string
    addRootUnitLabel: string
    addPositionLabel: string
    openPositionLabel: string
    moreActionsLabel: string
    selectUnitEmptyState: string
    emptyPositionsState: string
    positionSummaryLabels: { total: string; filled: string; open: string }
    tabs: readonly { id: string; label: string }[]
    statCards: readonly { key: string; label: string; tone: string }[]
    budgetCards: readonly { key: string; label: string; tone: string }[]
  }
  apiContractPath: string
}
