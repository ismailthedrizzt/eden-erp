export const MOVEMENT_TYPES = [
  'Harcama',
  'Tahsilat',
  'Ödeme',
  'Avans',
  'Masraf',
  'İade',
  'Borç Dekontu',
  'Alacak Dekontu',
  'Açılış Bakiyesi',
  'Virman',
]

export const PAYMENT_METHODS = [
  'Şirket Banka Hesabı',
  'Şirket Kredi Kartı',
  'Şirket Kasası',
  'Şahsi Ödeme',
  'Ortak Ödemesi',
  'Çalışan Avansı',
  'Diğer',
]

export const MOVEMENT_STATUSES = [
  'Taslak',
  'Onay Bekliyor',
  'Onaylandı',
  'Reddedildi',
  'Kesinleşti',
  'İptal',
  'Pasif',
]

export const ROW_HEALTH_LABELS: Record<string, string> = {
  complete: 'Tamam',
  missing_document: 'Belge Eksik',
  missing_bank_match: 'Banka / Kart Hareketi Bulunamadı',
  invoice_rejected: 'E-Fatura Reddedildi',
  invoice_cancelled: 'E-Fatura İptal Edildi',
  amount_mismatch: 'Tutar Tutarsız',
  manual_review_required: 'İnceleme Gerekli',
  auto_matched: 'Otomatik Eşleşti',
  manual_matched: 'Manuel Eşleşti',
}
