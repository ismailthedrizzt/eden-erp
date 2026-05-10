import type { ColumnDef } from '@/components/ui/SmartDataTable'

export const transactionTypes = [
  'Yeni Ortaklık Girişi',
  'Pay Devri',
  'Kısmi Pay Devri',
  'Ortaklıktan Çıkış',
  'Oy Hakkı Değişikliği',
  'Kar Payı Oranı Değişikliği',
  'İmtiyazlı Pay Tanımı',
  'İmtiyazlı Pay Kaldırma',
  'Düzeltme Kaydı',
  'Ters Kayıt',
] as const

export const transactionReasonOptions = [
  'Kuruluş',
  'Pay Devri',
  'Yönetim Kararı',
  'Ortaklar Kurulu Kararı',
  'Düzeltme',
  'Diğer',
]

export const privilegeTypeOptions = [
  'Oy İmtiyazı',
  'Kar Payı İmtiyazı',
  'Yönetim Kurulu Aday Gösterme Hakkı',
  'Veto Hakkı',
  'Altın Hisse',
  'Diğer',
]

export const documentStatusOptions = ['Belge Yok', 'Bekleniyor', 'Yüklendi', 'Onaylandı', 'Eksik', 'Hatalı']

export const approvalStatusLabels: Record<string, string> = {
  draft: 'Taslak',
  pending_approval: 'Onay Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal Edildi',
}

export const statusLabels: Record<string, string> = {
  draft: 'Taslak',
  active: 'Aktif',
  cancelled: 'İptal Edildi',
  reversed: 'Ters Kayıt',
  passive: 'Pasif',
}

export const ownershipTransactionColumns: ColumnDef[] = [
  { key: 'transaction_no', label: 'İşlem No', type: 'text', width: 140, sortable: true, category: 'Genel' },
  { key: 'company_name', label: 'Şirket', type: 'text', width: 220, sortable: true, category: 'Genel' },
  { key: 'partner_name', label: 'Ortak', type: 'text', width: 190, sortable: true, category: 'Genel' },
  { key: 'transaction_type', label: 'İşlem Tipi', type: 'enum', width: 190, sortable: true, category: 'Genel' },
  { key: 'transaction_date', label: 'İşlem Tarihi', type: 'date', width: 130, sortable: true, category: 'Tarih' },
  { key: 'effective_date', label: 'Yürürlük Başlangıç Tarihi', type: 'date', width: 190, sortable: true, category: 'Tarih' },
  { key: 'share_effect', label: 'Hisse Etkisi', type: 'text', width: 120, category: 'Etkiler' },
  { key: 'voting_effect', label: 'Oy Hakkı Etkisi', type: 'text', width: 140, category: 'Etkiler' },
  { key: 'profit_effect', label: 'Kar Payı Etkisi', type: 'text', width: 130, category: 'Etkiler' },
  { key: 'privilege_effect', label: 'İmtiyaz Etkisi', type: 'text', width: 150, category: 'Etkiler' },
  { key: 'status_label', label: 'Durum', type: 'enum', width: 130, category: 'Durum' },
  { key: 'approval_status_label', label: 'Onay Durumu', type: 'enum', width: 150, category: 'Durum' },
  { key: 'document_status', label: 'Belge', type: 'enum', width: 120, category: 'Belge' },
  { key: 'row_actions', label: 'İşlemler', type: 'actions', width: 240, fixed: true, hideable: false, category: 'İşlemler' },
]

export function getPartyFieldVisibility(transactionType?: string) {
  return {
    showFrom: ['Pay Devri', 'Kısmi Pay Devri'].includes(transactionType || ''),
    showExit: transactionType === 'Ortaklıktan Çıkış',
    showTo: ['Yeni Ortaklık Girişi', 'Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış'].includes(transactionType || ''),
    showAffected: [
      'Oy Hakkı Değişikliği',
      'Kar Payı Oranı Değişikliği',
      'İmtiyazlı Pay Tanımı',
      'İmtiyazlı Pay Kaldırma',
      'Düzeltme Kaydı',
      'Ters Kayıt',
    ].includes(transactionType || ''),
  }
}
