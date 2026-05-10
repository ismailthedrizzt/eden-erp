import type { AnyDashboardWidgetConfig } from '@/components/dashboard/dashboard.types'
import type { OwnershipTransaction } from './ownershipTransactions.types'

const distributionTypes = [
  'Yeni Ortak Girişi',
  'Pay Devri',
  'Sermaye Artırımı',
  'Sermaye Azaltımı',
  'Oy Hakkı Değişikliği',
  'Kar Payı Değişikliği',
  'Ortaklıktan Çıkış',
  'Düzeltme Kaydı',
]

export function buildOwnershipTransactionsDashboard(rows: OwnershipTransaction[]): AnyDashboardWidgetConfig[] {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const thisMonth = rows.filter(row => {
    const date = row.transaction_date ? new Date(row.transaction_date) : null
    return date && date.getFullYear() === year && date.getMonth() === month
  })
  const pending = rows.filter(row => row.approval_status === 'pending_approval')
  const missingDocuments = rows.filter(row => ['Belge Yok', 'Eksik', 'Hatalı'].includes(row.document_status || 'Belge Yok'))

  return [
    {
      id: 'ownership-this-month',
      type: 'kpi',
      title: 'Bu Ayki İşlem Sayısı',
      module: 'sirket',
      size: { w: 1, h: 1 },
      dataSource: 'ownershipTransactions.thisMonth',
      value: thisMonth.length,
      label: 'Bu ay açılan işlem',
      subtitle: 'İşlem tarihi bazlı',
    },
    {
      id: 'ownership-type-distribution',
      type: 'stackedBar',
      title: 'İşlem Türü Dağılımı',
      module: 'sirket',
      size: { w: 2, h: 1 },
      dataSource: 'ownershipTransactions.byType',
      items: distributionTypes.map((type, index) => ({
        label: type,
        value: rows.filter(row => normalizeType(row.transaction_type) === type).length,
        color: ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0891b2', '#be123c', '#64748b'][index],
        filter: { transaction_type: type },
      })),
      total: rows.length,
      showLegend: true,
    },
    {
      id: 'ownership-approval-status',
      type: 'distribution',
      title: 'Onay Durumu',
      module: 'sirket',
      size: { w: 1, h: 1 },
      dataSource: 'ownershipTransactions.approval',
      items: [
        { label: 'Taslak', value: rows.filter(row => row.approval_status === 'draft').length },
        { label: 'Onay Bekliyor', value: pending.length },
        { label: 'Onaylandı', value: rows.filter(row => row.approval_status === 'approved').length },
        { label: 'Reddedildi', value: rows.filter(row => row.approval_status === 'rejected').length },
      ],
    },
    {
      id: 'ownership-pending',
      type: 'kpi',
      title: 'Bekleyen İşlemler',
      module: 'sirket',
      size: { w: 1, h: 1 },
      dataSource: 'ownershipTransactions.pending',
      value: pending.length,
      label: 'Onay bekleyen ortaklık işlemi sayısı',
    },
    {
      id: 'ownership-share-delta',
      type: 'kpi',
      title: 'Toplam Pay Değişimi',
      module: 'sirket',
      size: { w: 1, h: 1 },
      dataSource: 'ownershipTransactions.shareDelta',
      value: `${rows.reduce((sum, row) => sum + Number(row.share_ratio || 0), 0).toFixed(2)}%`,
      label: 'Kayıtlardaki pay hareketi',
    },
    {
      id: 'ownership-actions',
      type: 'actionList',
      title: 'Dikkat Gerektiren İşlemler',
      module: 'sirket',
      size: { w: 2, h: 1 },
      dataSource: 'ownershipTransactions.attention',
      items: [
        { id: 'missing-documents', label: 'Belge eksik', description: `${missingDocuments.length} işlem`, severity: missingDocuments.length ? 'warning' : 'success' },
        { id: 'share-total', label: 'Toplam hisse 100% değil', severity: 'warning' },
        { id: 'pending', label: 'Onay bekliyor', description: `${pending.length} işlem`, severity: pending.length ? 'info' : 'success' },
        { id: 'overlap', label: 'Tarihsel çakışma var', severity: 'info' },
        { id: 'circular', label: 'Döngüsel ortaklık riski', severity: 'info' },
      ],
    },
  ]
}

function normalizeType(type: string) {
  if (type === 'Kar Payı Oranı Değişikliği') return 'Kar Payı Değişikliği'
  if (type === 'Kısmi Pay Devri') return 'Pay Devri'
  return type
}
