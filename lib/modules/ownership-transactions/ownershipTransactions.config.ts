import type { ColumnDef } from '@/components/ui/SmartDataTable'

export const transactionTypes = [
  'Yeni Ortak Girişi',
  'Pay Devri',
  'Kısmi Pay Devri',
  'Ortaklıktan Çıkış',
  'Sermaye Artırımı',
  'Sermaye Azaltımı',
  'Oy Hakkı Değişikliği',
  'Kar Payı Oranı Değişikliği',
  'İmtiyazlı Pay Tanımı',
  'İmtiyazlı Pay Kaldırma',
  'Kontrol Hakkı Tanımı',
  'Veto Hakkı Tanımı',
  'Yönetim Kurulu Aday Hakkı Tanımı',
  'Nihai Faydalanıcı Değişikliği',
  'Düzeltme Kaydı',
  'Ters Kayıt',
] as const

export const transactionReasonOptions = [
  'Kuruluş',
  'Pay Devri',
  'Sermaye Değişikliği',
  'Yönetim Kararı',
  'Ortaklar Kurulu Kararı',
  'Düzeltme',
  'Diğer',
]

export const privilegeTypeOptions = [
  'Oy İmtiyazı',
  'Kar Payı İmtiyazı',
  'Yönetim Kurulu Aday Gösterme',
  'Veto Hakkı',
  'Altın Hisse',
  'Diğer',
]

export const controlTypeOptions = [
  'Hisse Çoğunluğu',
  'Oy Çoğunluğu',
  'Sözleşmesel Kontrol',
  'Yönetim Kontrolü',
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
  { key: 'transaction_type', label: 'İşlem Tipi', type: 'enum', width: 190, sortable: true, category: 'Genel' },
  { key: 'from_partner_name', label: 'Devreden Ortak', type: 'text', width: 180, category: 'Taraflar' },
  { key: 'to_partner_name', label: 'Devralan Ortak', type: 'text', width: 180, category: 'Taraflar' },
  { key: 'affected_partner_name', label: 'Etkilenen Ortak', type: 'text', width: 180, category: 'Taraflar' },
  { key: 'share_ratio', label: 'Pay %', type: 'number', width: 100, category: 'Pay' },
  { key: 'voting_ratio', label: 'Oy %', type: 'number', width: 100, category: 'Pay' },
  { key: 'profit_ratio', label: 'Kar Payı %', type: 'number', width: 120, category: 'Pay' },
  { key: 'capital_amount', label: 'Sermaye Tutarı', type: 'number', width: 150, category: 'Pay' },
  { key: 'transaction_date', label: 'İşlem Tarihi', type: 'date', width: 130, sortable: true, category: 'Tarih' },
  { key: 'effective_date', label: 'Geçerlilik Tarihi', type: 'date', width: 145, sortable: true, category: 'Tarih' },
  { key: 'status_label', label: 'Durum', type: 'enum', width: 130, category: 'Durum' },
  { key: 'approval_status_label', label: 'Onay Durumu', type: 'enum', width: 150, category: 'Durum' },
  { key: 'document_status', label: 'Belge', type: 'enum', width: 120, category: 'Belge' },
  { key: 'row_actions', label: 'İşlemler', type: 'actions', width: 240, fixed: true, hideable: false, category: 'İşlemler' },
]

export function getPartyFieldVisibility(transactionType?: string) {
  return {
    showFrom: ['Pay Devri', 'Kısmi Pay Devri'].includes(transactionType || ''),
    showExit: transactionType === 'Ortaklıktan Çıkış',
    showTo: ['Yeni Ortak Girişi', 'Pay Devri', 'Kısmi Pay Devri'].includes(transactionType || ''),
    showAffected: [
      'Oy Hakkı Değişikliği',
      'Kar Payı Oranı Değişikliği',
      'İmtiyazlı Pay Tanımı',
      'İmtiyazlı Pay Kaldırma',
      'Kontrol Hakkı Tanımı',
      'Veto Hakkı Tanımı',
      'Yönetim Kurulu Aday Hakkı Tanımı',
      'Nihai Faydalanıcı Değişikliği',
      'Düzeltme Kaydı',
      'Ters Kayıt',
      'Sermaye Artırımı',
      'Sermaye Azaltımı',
    ].includes(transactionType || ''),
  }
}
